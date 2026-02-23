export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlatformKeypair } from '@/lib/solana/platformWallet'

type Body = { transfer_id: string; to_dealer_id: string }

type TransferRow = {
  id: string
  gun_uid: string
  from_dealer_id: string
  to_dealer_id: string
  from_wallet: string
  to_wallet: string
  status: 'pending' | 'accepted' | 'completed' | 'failed'
}

type InventoryRow = {
  gun_uid: string
  owner_id: string
  minted: boolean | null
  mint_address: string | null // you store firearm PDA base58 here
}

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status })
}

function parseBody(x: unknown): Body {
  if (!x || typeof x !== 'object') throw new Error('Invalid JSON body')
  const o = x as Record<string, unknown>
  const transfer_id = String(o.transfer_id || '')
  const to_dealer_id = String(o.to_dealer_id || '')
  if (!transfer_id) throw new Error('Missing transfer_id')
  if (!to_dealer_id) throw new Error('Missing to_dealer_id')
  return { transfer_id, to_dealer_id }
}

function getConnection() {
  const url = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com'
  return new Connection(url, 'confirmed')
}

function discriminator(globalName: string) {
  const preimage = Buffer.from(`global:${globalName}`, 'utf8')
  const hash = crypto.createHash('sha256').update(preimage).digest()
  return hash.subarray(0, 8)
}

function u32LE(n: number) {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n, 0)
  return b
}

function stringBorsh(s: string) {
  const bytes = Buffer.from(s, 'utf8')
  return Buffer.concat([u32LE(bytes.length), bytes])
}

// ✅ This is the ONLY part you might need to adjust to match your Anchor program.
// Assumption: instruction name = "transfer_firearm"
// args: new_owner_id (string)
// accounts order (guess): firearm, authority
function buildTransferIx(args: {
  programId: PublicKey
  firearm: PublicKey
  authority: PublicKey
  newOwnerId: string
}) {
  const data = Buffer.concat([
    Buffer.from(discriminator('transfer_firearm')),
    stringBorsh(args.newOwnerId),
  ])

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.firearm, isSigner: false, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: true },
      // If your program expects more accounts (config/system/etc), add them here.
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

export async function POST(req: Request) {
  try {
    if (!process.env.FIREARM_PROGRAM_ID) {
      return json(500, { ok: false, error: 'Missing FIREARM_PROGRAM_ID in .env.local' })
    }
    if (!process.env.PLATFORM_WALLET_KEYPAIR_PATH) {
      return json(500, { ok: false, error: 'Missing PLATFORM_WALLET_KEYPAIR_PATH in .env.local' })
    }

    const { transfer_id, to_dealer_id } = parseBody(await req.json())

    // 1) load transfer
    const { data: t, error: tErr } = await supabaseAdmin
      .from('transfers')
      .select('id, gun_uid, from_dealer_id, to_dealer_id, from_wallet, to_wallet, status')
      .eq('id', transfer_id)
      .single<TransferRow>()

    if (tErr || !t) return json(404, { ok: false, error: 'Transfer not found' })
    if (t.to_dealer_id !== to_dealer_id) return json(403, { ok: false, error: 'Not your transfer' })
    if (t.status !== 'pending') return json(409, { ok: false, error: `Transfer not pending (is ${t.status})` })

    // 2) load inventory (needs mint_address)
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('inventory')
      .select('gun_uid, owner_id, minted, mint_address')
      .eq('gun_uid', t.gun_uid)
      .single<InventoryRow>()

    if (invErr || !inv) return json(404, { ok: false, error: 'Gun not found' })
    if (inv.owner_id !== t.from_dealer_id) return json(409, { ok: false, error: 'Gun owner changed; cannot accept' })
    if (!inv.minted || !inv.mint_address) return json(400, { ok: false, error: 'Gun not minted' })

    // 3) mark accepted (optional but useful)
    const { error: markErr } = await supabaseAdmin
      .from('transfers')
      .update({ status: 'accepted' })
      .eq('id', transfer_id)
      .eq('status', 'pending')

    if (markErr) return json(500, { ok: false, error: markErr.message })

    // 4) ON-CHAIN transfer (program instruction updates owner)
    const connection = getConnection()
    const platform = getPlatformKeypair()
    const programId = new PublicKey(process.env.FIREARM_PROGRAM_ID)

    const firearm = new PublicKey(inv.mint_address) // stored PDA
    const ix = buildTransferIx({
      programId,
      firearm,
      authority: platform.publicKey,
      newOwnerId: t.to_dealer_id,
    })

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    const tx = new Transaction({
      feePayer: platform.publicKey,
      recentBlockhash: blockhash,
    }).add(ix)

    tx.sign(platform)

    let sig = ''
    try {
      sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
    } catch (chainErr) {
      // chain failed => mark failed, do NOT move owner in DB
      await supabaseAdmin
        .from('transfers')
        .update({ status: 'failed' })
        .eq('id', transfer_id)

      const msg = chainErr instanceof Error ? chainErr.message : String(chainErr)
      return json(500, { ok: false, error: `Chain transfer failed: ${msg}` })
    }

    // 5) chain success => complete + move owner in DB
    const { error: doneErr } = await supabaseAdmin
      .from('transfers')
      .update({ status: 'completed', tx_sig: sig })
      .eq('id', transfer_id)

    if (doneErr) {
      return json(500, { ok: false, error: `On-chain ok but failed to mark transfer completed: ${doneErr.message}`, txSig: sig })
    }

    const { error: invUpdErr } = await supabaseAdmin
      .from('inventory')
      .update({
        owner_id: t.to_dealer_id,
        ownership_state: 'DEALER',
        last_transfer_at: new Date().toISOString(),
      })
      .eq('gun_uid', t.gun_uid)

    if (invUpdErr) {
      return json(500, { ok: false, error: `On-chain ok but failed to update inventory owner: ${invUpdErr.message}`, txSig: sig })
    }

    return json(200, { ok: true, txSig: sig })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json(500, { ok: false, error: msg })
  }
}
