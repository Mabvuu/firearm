import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type EventRow = {
  id: number
  application_uid: string
  from_status: string | null
  to_status: string
  action: string
  actor_email: string | null
  actor_role: string | null
  note: string | null
  created_at: string
}

export async function GET(_: Request, ctx: { params: { uid: string } }) {
  try {
    const uid = ctx.params.uid

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
    }

    // Get application (by application_uid)
    const { data: application, error: appErr } = await supabaseAdmin
      .from('applications')
      .select(
        'application_uid, applicant_name, applicant_email, officer_email, gun_uid, status, created_at'
      )
      .eq('application_uid', uid)
      .single()

    if (appErr) {
      return NextResponse.json({ error: appErr.message }, { status: 500 })
    }

    // Get timeline events
    const { data: events, error: evErr } = await supabaseAdmin
      .from('application_events')
      .select(
        'id, application_uid, from_status, to_status, action, actor_email, actor_role, note, created_at'
      )
      .eq('application_uid', uid)
      .order('created_at', { ascending: true })

    if (evErr) {
      return NextResponse.json({ error: evErr.message }, { status: 500 })
    }

    return NextResponse.json({
      application,
      events: (events ?? []) as EventRow[],
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
