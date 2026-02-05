// app/api/dealer/wallet/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { dealerId?: string } | null
  const dealerId = body?.dealerId

  if (!dealerId) {
    return NextResponse.json({ ok: false, error: 'Missing dealerId' }, { status: 400 })
  }

  const { data: existing, error: exErr } = await supabaseAdmin
    .from('dealer_wallets')
    .select('dealer_id,wallet_pubkey,credits')
    .eq('dealer_id', dealerId)
    .maybeSingle()

  if (exErr) {
    return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({
      ok: true,
      wallet_pubkey: existing.wallet_pubkey,
      credits: existing.credits,
    })
  }

  const kp = Keypair.generate()
  const secret58 = bs58.encode(kp.secretKey)

  const { data, error } = await supabaseAdmin
    .from('dealer_wallets')
    .insert({
      dealer_id: dealerId,
      wallet_pubkey: kp.publicKey.toBase58(),
      wallet_secret_enc: secret58, // STORED PLAIN TEXT (DEV ONLY)
      credits: 0,
    })
    .select('wallet_pubkey,credits')
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    wallet_pubkey: data.wallet_pubkey,
    credits: data.credits,
  })
}
