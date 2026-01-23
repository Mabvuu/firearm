import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()

  const {
    user_id,
    full_name,
    national_id,

    violent_crime_history,
    violent_crime_details,

    restraining_orders,
    restraining_order_details,

    mental_instability,
    mental_instability_details,

    substance_abuse,
    substance_abuse_details,

    firearms_training,
    firearms_training_details,

    threat_to_self_or_others,
    threat_details,

    notes,
  } = body

  if (!user_id || !national_id || !full_name) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // 🔒 HARD DUPLICATE BLOCK (DB + API)
  const { data: existing } = await supabase
    .from('competency')
    .select('id')
    .eq('national_id', national_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Competency already exists for this National ID' },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('competency').insert({
    user_id,
    full_name,
    national_id,

    violent_crime_history,
    violent_crime_details,

    restraining_orders,
    restraining_order_details,

    mental_instability,
    mental_instability_details,

    substance_abuse,
    substance_abuse_details,

    firearms_training,
    firearms_training_details,

    threat_to_self_or_others,
    threat_details,

    notes,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
