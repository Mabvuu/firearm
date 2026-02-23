// app/api/applications/decline/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Body = {
  applicationId: number
  stage: string
  reason: string
}

const COOLDOWN_DAYS = 60

const addDays = (d: Date, days: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

const fmtDate = (d: Date) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>

    const applicationId = Number(body.applicationId)
    const stage = String(body.stage ?? '').trim()
    const reason = String(body.reason ?? '').trim()

    if (!applicationId || !stage || !reason) {
      return NextResponse.json(
        { ok: false, error: 'Missing applicationId / stage / reason' },
        { status: 400 },
      )
    }

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ ok: false, error: 'Not logged in' }, { status: 401 })

    const {
      data: { user },
      error: userErr,
    } = await supabaseAdmin.auth.getUser(token)

    if (userErr || !user?.id) {
      return NextResponse.json({ ok: false, error: 'Not logged in' }, { status: 401 })
    }

    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('email, role')
      .eq('auth_uid', user.id)
      .maybeSingle<{ email: string | null; role: string | null }>()

    const actorEmail = (prof?.email || user.email || '').trim()
    const actorRole = (prof?.role || 'unknown').trim()

    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('id, status, application_uid')
      .eq('id', applicationId)
      .single<{ id: number; status: string | null; application_uid: string }>()

    if (appErr || !app) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 })
    }

    const currentStatus = String(app.status ?? '')
    if (currentStatus === 'approved' || currentStatus === 'declined') {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const { error: updErr } = await supabaseAdmin
      .from('applications')
      .update({ status: 'declined' })
      .eq('id', applicationId)

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })
    }

    const today = new Date()
    const reapplyOn = addDays(today, COOLDOWN_DAYS)
    const note =
      `This application has been declined at ${stage}.\n` +
      `Reason: ${reason}\n` +
      `You can try again after ${COOLDOWN_DAYS} days (on/after ${fmtDate(reapplyOn)}).`

    const { error: evErr } = await supabaseAdmin.from('application_events').insert([
      {
        application_uid: app.application_uid,
        from_status: currentStatus || null,
        to_status: 'declined',
        action: 'DECLINE',
        actor_email: actorEmail || null,
        actor_role: actorRole || null,
        note,
      },
    ])

    if (evErr) {
      return NextResponse.json(
        { ok: true, warning: 'Declined but failed to write tracking event' },
        { status: 200 },
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
