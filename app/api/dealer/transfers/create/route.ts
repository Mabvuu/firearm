// app/api/dealer/transfers/create/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Body = {
  gun_uid: string
  from_dealer_id: string
  to_email: string
}

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status })
}

function parseBody(x: unknown): Body {
  if (!x || typeof x !== 'object') throw new Error('Invalid JSON body')
  const o = x as Record<string, unknown>

  const gun_uid = String(o.gun_uid || '')
  const from_dealer_id = String(o.from_dealer_id || '')
  const to_email = String(o.to_email || '').trim().toLowerCase()

  if (!gun_uid) throw new Error('Missing gun_uid')
  if (!from_dealer_id) throw new Error('Missing from_dealer_id')
  if (!to_email) throw new Error('Missing to_email')

  return { gun_uid, from_dealer_id, to_email }
}

export async function POST(req: Request) {
  try {
    const body = parseBody(await req.json())

    // resolve sender national_id
    const { data: fromProf, error: fromErr } = await supabaseAdmin
      .from('profiles')
      .select('auth_uid, national_id, role')
      .eq('auth_uid', body.from_dealer_id)
      .maybeSingle()

    if (fromErr) return json(500, { ok: false, error: fromErr.message })
    if (!fromProf?.national_id) return json(404, { ok: false, error: 'Sender profile not found' })
    if (fromProf.role !== 'dealer') return json(403, { ok: false, error: 'Sender is not a dealer' })

    // resolve receiver by email (dealer)
    const { data: toProf, error: toErr } = await supabaseAdmin
      .from('profiles')
      .select('auth_uid, national_id, role, email')
      .eq('role', 'dealer')
      .ilike('email', body.to_email)
      .maybeSingle()

    if (toErr) return json(500, { ok: false, error: toErr.message })
    if (!toProf?.auth_uid || !toProf?.national_id) {
      return json(404, { ok: false, error: 'Dealer email not found' })
    }

    if (String(toProf.auth_uid) === body.from_dealer_id) {
      return json(400, { ok: false, error: 'Cannot transfer to yourself' })
    }

    // verify gun exists + belongs to sender + minted
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('inventory')
      .select('gun_uid, owner_id, minted, mint_address')
      .eq('gun_uid', body.gun_uid)
      .maybeSingle()

    if (invErr) return json(500, { ok: false, error: invErr.message })
    if (!inv) return json(404, { ok: false, error: 'Gun not found' })

    if (inv.owner_id !== body.from_dealer_id) {
      return json(403, { ok: false, error: 'Not your gun' })
    }

    if (!inv.minted || !inv.mint_address) {
      return json(400, { ok: false, error: 'Gun must be minted before transfer' })
    }

    // create transfer row (store national_id inside from_wallet/to_wallet)
    const { data: t, error: tErr } = await supabaseAdmin
      .from('transfers')
      .insert({
        gun_uid: body.gun_uid,
        from_dealer_id: body.from_dealer_id,
        to_dealer_id: String(toProf.auth_uid),
        from_wallet: String(fromProf.national_id),
        to_wallet: String(toProf.national_id),
        status: 'pending',
      })
      .select('id, gun_uid, status, created_at')
      .single()

    if (tErr) return json(409, { ok: false, error: tErr.message })

    return json(200, { ok: true, transfer: t })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json(500, { ok: false, error: msg })
  }
}
