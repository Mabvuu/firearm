import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = (searchParams.get('email') || '').trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ ok: false, error: 'Missing email' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('role', 'dealer')
    .ilike('email', email)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ ok: false, exists: false }, { status: 404 })
  }

  return NextResponse.json({ ok: true, exists: true })
}
