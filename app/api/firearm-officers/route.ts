// app/api/firearm-officers/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('role', 'police.firearmofficer')

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data ?? [])
}
