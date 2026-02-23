import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: { gun_uid: string } }
) {
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .select(
      'gun_uid, serial, make, model, caliber, ownership_state, owner_id, status'
    )
    .eq('gun_uid', params.gun_uid)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    name: `Firearm ${data.serial ?? data.gun_uid}`,
    symbol: 'GUN',
    description: 'Firearm inventory token',
    attributes: [
      { trait_type: 'gun_uid', value: data.gun_uid },
      { trait_type: 'serial', value: data.serial ?? '' },
      { trait_type: 'make', value: data.make },
      { trait_type: 'model', value: data.model },
      { trait_type: 'caliber', value: data.caliber ?? '' },
      { trait_type: 'ownership_state', value: data.ownership_state },
      { trait_type: 'owner_id', value: String(data.owner_id) },
      { trait_type: 'status', value: data.status },
    ],
  })
}
