export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Body = { dealer_id: string }

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status })
}

function parseBody(x: unknown): Body {
  if (!x || typeof x !== 'object') throw new Error('Invalid JSON body')
  const o = x as Record<string, unknown>
  const dealer_id = String(o.dealer_id || '')
  if (!dealer_id) throw new Error('Missing dealer_id')
  return { dealer_id }
}

export async function POST(req: Request) {
  try {
    const { dealer_id } = parseBody(await req.json())

    const { data: prof, error } = await supabaseAdmin
      .from('profiles')
      .select('role, national_id, dealer_wallet_address, personal_wallet_address')
      .eq('auth_uid', dealer_id)
      .maybeSingle()

    if (error) return json(500, { ok: false, error: error.message })
    if (!prof) return json(404, { ok: false, error: 'Profile not found' })
    if (prof.role !== 'dealer') return json(403, { ok: false, error: 'Not a dealer' })

    // business wallet defaults to national_id
    const dealer_wallet_address = prof.dealer_wallet_address || prof.national_id || null
    const personal_wallet_address = prof.personal_wallet_address || null

    return json(200, {
      ok: true,
      dealer_wallet_address,
      personal_wallet_address,
      national_id: prof.national_id,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json(500, { ok: false, error: msg })
  }
}
