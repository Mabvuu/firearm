import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      email,
      applicant_name,
      national_id,
      address,
      phone,
      province,
      district,
      gun_uid,
      officer_email,
      attachments,
    } = body

    if (!email || !gun_uid || !officer_email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // 1) Create application with current status
    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert({
        applicant_email: email,        // keep your existing column
        applicant_name,
        national_id,
        address,
        phone,
        province,
        district,
        gun_uid,
        officer_email,
        attachments,
        status: 'assigned_to_officer', // ✅ current status
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    const application_uid = String(data.application_uid)


    // 2) Insert tracking events (history)
    const { error: evErr } = await supabaseAdmin.from('application_events').insert([
      {
        application_uid,
        from_status: null,
        to_status: 'created',
        action: 'CREATE',
        actor_email: email,
        actor_role: 'dealer',
        note: 'Dealer created application',
      },
      {
        application_uid,
        from_status: 'created',
        to_status: 'assigned_to_officer',
        action: 'ASSIGN_TO_OFFICER',
        actor_email: email,
        actor_role: 'dealer',
        note: `Assigned to officer ${officer_email}`,
      },
    ])

    if (evErr) {
      console.error(evErr)
      // don't fail the request — app is created
      return NextResponse.json({
        ok: true,
        application_uid,
        warning: 'Tracking insert failed',
      })
    }

    return NextResponse.json({ ok: true, application_uid })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
