export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Body = { dealer_id: string; wallet_address: string }

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status })
}

function parseBody(x: unknown): Body {
  if (!x || typeof x !== 'object') throw new Error('Invalid JSON body')
  const o = x as Record<string, unknown>
  const dealer_id = String(o.dealer_id || '')
  const wallet_address = String(o.wallet_address || '').trim()
  if (!dealer_id) throw new Error('Missing dealer_id')
  if (!wallet_address) throw new Error('Missing wallet_address')
  return { dealer_id, wallet_address }
}

export async function POST(req: Request) {
  try {
    const { dealer_id, wallet_address } = parseBody(await req.json())

    // Only show the dealer’s own guns, split by current_owner_wallet
    const { data, error } = await supabaseAdmin
      .from('inventory')
      .select('id, gun_uid, make, model, caliber, serial, date_of_import, minted, minted_at, ownership_state, current_owner_wallet')
      .eq('owner_id', dealer_id)
      .eq('current_owner_wallet', wallet_address)
      .neq('ownership_state', 'CIVILIAN')
      .order('id', { ascending: true })

    if (error) return json(500, { ok: false, error: error.message })
    return json(200, { ok: true, inventory: data || [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json(500, { ok: false, error: msg })
  }
}
