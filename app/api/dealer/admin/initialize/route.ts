// firearm-system/app/api/dealer/mint/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlatformKeypair } from '@/lib/solana/platformWallet'

type MintBody = { inventory_id: number; dealer_id: string }

type InventoryRow = {
  id: number
  serial: string | null
  make: string
  model: string
  caliber: string
  date_of_import: string
  owner_id: string
  minted: boolean | null
}

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status })
}

function parseBody(x: unknown): MintBody {
  if (!x || typeof x !== 'object') throw new Error('Invalid JSON body')
  const o = x as Record<string, unknown>
  const inventory_id = Number(o.inventory_id)
  const dealer_id = String(o.dealer_id || '')
  if (!Number.isFinite(inventory_id) || inventory_id <= 0) throw new Error('Missing/invalid inventory_id')
  if (!dealer_id) throw new Error('Missing dealer_id')
  return { inventory_id, dealer_id }
}

// ---------- Solana helpers ----------

function getConnection() {
  const url = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
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

function i64LE(n: number) {
  const bi = BigInt(Math.trunc(n))
  const b = Buffer.alloc(8)
  b.writeBigInt64LE(bi, 0)
  return b
}

function stringBorsh(s: string) {
  const bytes = Buffer.from(s, 'utf8')
  return Buffer.concat([u32LE(bytes.length), bytes])
}

// serial, make, model, caliber, dateBroughtIn(i64), ownerId(string)
function buildMintArgs(input: {
  serial: string
  make: string
  model: string
  caliber: string
  dateBroughtIn: number
  ownerId: string
}) {
  return Buffer.concat([
    stringBorsh(input.serial),
    stringBorsh(input.make),
    stringBorsh(input.model),
    stringBorsh(input.caliber),
    i64LE(input.dateBroughtIn),
    stringBorsh(input.ownerId),
  ])
}

// ---- PDA derivations (THIS is the real fix) ----
// Adjust seeds if your Rust uses different ones.
function getConfigPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], programId)[0]
}

function getFirearmPda(programId: PublicKey, nextId: bigint) {
  const idLE = Buffer.alloc(8)
  idLE.writeBigUInt64LE(nextId, 0)
  return PublicKey.findProgramAddressSync([Buffer.from('firearm'), idLE], programId)[0]
}

// Accounts order (typical Anchor PDA init):
// Initialize: config, authority, system_program
function buildInitializeIx(args: {
  programId: PublicKey
  config: PublicKey
  authority: PublicKey
}) {
  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      // PDA is NOT a signer
      { pubkey: args.config, isSigner: false, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(discriminator('initialize')),
  })
}

// MintFirearm: config, firearm, authority, system_program
function buildMintIx(args: {
  programId: PublicKey
  config: PublicKey
  firearm: PublicKey
  authority: PublicKey
  input: {
    serial: string
    make: string
    model: string
    caliber: string
    dateBroughtIn: number
    ownerId: string
  }
}) {
  const data = Buffer.concat([Buffer.from(discriminator('mint_firearm')), buildMintArgs(args.input)])

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.config, isSigner: false, isWritable: true },
      // PDA is NOT a signer
      { pubkey: args.firearm, isSigner: false, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

async function fetchNextId(connection: Connection, configPubkey: PublicKey) {
  const info = await connection.getAccountInfo(configPubkey, 'confirmed')
  if (!info?.data) throw new Error('Config not initialized yet')
  if (info.data.length < 48) throw new Error('Config account data too small (wrong config PDA?)')
  return info.data.readBigUInt64LE(40)
}

async function ensureInitialized(args: {
  connection: Connection
  platform: Keypair
  programId: PublicKey
  configPda: PublicKey
}) {
  const existing = await args.connection.getAccountInfo(args.configPda, 'confirmed')
  if (existing?.data) return

  const ix = buildInitializeIx({
    programId: args.programId,
    config: args.configPda,
    authority: args.platform.publicKey,
  })

  const { blockhash, lastValidBlockHeight } = await args.connection.getLatestBlockhash('confirmed')
  const tx = new Transaction({
    feePayer: args.platform.publicKey,
    recentBlockhash: blockhash,
  }).add(ix)

  // Only payer signs (PDAs don't sign)
  tx.sign(args.platform)

  const sig = await args.connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  })
  await args.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
}

// ---------- API ----------

export async function POST(req: Request) {
  try {
    if (!process.env.FIREARM_PROGRAM_ID) {
      return json(500, { ok: false, error: 'Missing FIREARM_PROGRAM_ID in .env.local' })
    }
    if (!process.env.PLATFORM_WALLET_KEYPAIR_PATH) {
      return json(500, { ok: false, error: 'Missing PLATFORM_WALLET_KEYPAIR_PATH in .env.local' })
    }

    const { inventory_id, dealer_id } = parseBody(await req.json())

    // 1) inventory check
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('inventory')
      .select('id,serial,make,model,caliber,date_of_import,owner_id,minted')
      .eq('id', inventory_id)
      .single<InventoryRow>()

    if (invErr || !inv) return json(404, { ok: false, error: 'Inventory item not found' })
    if (inv.owner_id !== dealer_id) return json(403, { ok: false, error: 'Not your inventory item' })
    if (inv.minted) return json(400, { ok: false, error: 'Already minted' })

    // 2) consume 1 credit
    const ref = `inv:${inventory_id}`
    const { data: ok, error: creditErr } = await supabaseAdmin.rpc('consume_one_credit', {
      p_dealer_id: dealer_id,
      p_ref: ref,
    })
    if (creditErr) return json(500, { ok: false, error: creditErr.message })
    if (ok !== true) return json(402, { ok: false, error: 'Not enough credits' })

    // 3) mint on-chain
    const connection = getConnection()
    const platform = getPlatformKeypair()
    const programId = new PublicKey(process.env.FIREARM_PROGRAM_ID)

    const configPda = getConfigPda(programId)
    await ensureInitialized({ connection, platform, programId, configPda })

    const nextId = await fetchNextId(connection, configPda)
    const firearmPda = getFirearmPda(programId, nextId)

    const dateBroughtInSec = Math.floor(new Date(inv.date_of_import).getTime() / 1000) || 0

    const ix = buildMintIx({
      programId,
      config: configPda,
      firearm: firearmPda,
      authority: platform.publicKey,
      input: {
        serial: inv.serial ?? '',
        make: inv.make,
        model: inv.model,
        caliber: inv.caliber,
        dateBroughtIn: dateBroughtInSec,
        ownerId: dealer_id,
      },
    })

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
    const tx = new Transaction({
      feePayer: platform.publicKey,
      recentBlockhash: blockhash,
    }).add(ix)

    // Only payer signs
    tx.sign(platform)

    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })

    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')

    // 4) update DB minted
    const { error: updErr } = await supabaseAdmin
      .from('inventory')
      .update({ minted: true, minted_at: new Date().toISOString() })
      .eq('id', inventory_id)

    if (updErr) {
      await supabaseAdmin.rpc('refund_one_credit', { p_dealer_id: dealer_id, p_ref: ref })
      return json(500, { ok: false, error: 'Minted on-chain but DB update failed (refunded)', txSig: sig })
    }

    return json(200, {
      ok: true,
      txSig: sig,
      config: configPda.toBase58(),
      firearm: firearmPda.toBase58(),
      nextId: nextId.toString(),
    })
  } catch (e) {
    console.error('MINT API ERROR:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return json(500, { ok: false, error: msg })
  }
}
