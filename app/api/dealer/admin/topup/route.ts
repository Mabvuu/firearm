// app/api/admin/topup/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type TopupBody = { dealerId?: string; amount?: number }

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as TopupBody | null
  const dealerId = body?.dealerId
  const amount = body?.amount

  if (!dealerId || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: 'Bad input' }, { status: 400 })
  }

  // TODO: enforce admin auth/role check here

  // ensure row exists
  const { data: row, error: getErr } = await supabaseAdmin
    .from('dealer_wallets')
    .select('credits')
    .eq('dealer_id', dealerId)
    .maybeSingle()

  if (getErr) return NextResponse.json({ ok: false, error: getErr.message }, { status: 500 })
  if (!row) return NextResponse.json({ ok: false, error: 'Dealer wallet not found (create it first)' }, { status: 404 })

  const newCredits = (row.credits ?? 0) + Math.floor(amount)

  const { error: upErr } = await supabaseAdmin
    .from('dealer_wallets')
    .update({ credits: newCredits })
    .eq('dealer_id', dealerId)

  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, dealerId, credits: newCredits })
}
