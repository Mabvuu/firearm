// app/api/applications/[uid]/timeline/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type ApplicationRow = {
  application_uid: string
  applicant_name: string | null
  applicant_email: string | null
  created_by_email: string | null
  officer_email: string | null
  gun_uid: number | null
  status: string | null
  created_at: string
}

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

export async function GET(req: Request, ctx: { params: { uid: string } }) {
  try {
    const uid = ctx.params.uid
    if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 })

    // ✅ Require auth
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(token)

    if (userErr || !user?.email) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    const dealerEmail = user.email

    // ✅ Get application (must belong to this dealer)
    const { data: application, error: appErr } = await supabaseAdmin
      .from('applications')
      .select(
        'application_uid, applicant_name, applicant_email, created_by_email, officer_email, gun_uid, status, created_at'
      )
      .eq('application_uid', uid)
      .maybeSingle<ApplicationRow>()

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 500 })
    if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const owner =
      (application.created_by_email || '').toLowerCase() ||
      (application.applicant_email || '').toLowerCase()

    if (owner !== dealerEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ✅ Get timeline events
    const { data: events, error: evErr } = await supabaseAdmin
      .from('application_events')
      .select(
        'id, application_uid, from_status, to_status, action, actor_email, actor_role, note, created_at'
      )
      .eq('application_uid', uid)
      .order('created_at', { ascending: true })

    if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 })

    return NextResponse.json({
      application,
      events: (events ?? []) as EventRow[],
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
