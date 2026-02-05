// app/api/dealer/application/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Body = {
  applicant_name?: string
  national_id?: string
  address?: string
  phone?: string
  province?: string
  district?: string
  gun_uid?: number | null
  officer_email?: string
  attachments?: string[]
}

type OfficerProfile = {
  auth_uid: string | null
  email: string | null
  role: string | null
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    const applicant_name = (body.applicant_name ?? '').trim()
    const national_id = (body.national_id ?? '').trim()
    const address = (body.address ?? '').trim()
    const phone = (body.phone ?? '').trim()
    const province = (body.province ?? '').trim()
    const district = (body.district ?? '').trim()
    const gun_uid = body.gun_uid ?? null
    const officer_email = (body.officer_email ?? '').trim()
    const attachments = Array.isArray(body.attachments) ? body.attachments : []

    if (!applicant_name || !national_id || !address || !phone || !province || !district) {
      return NextResponse.json({ error: 'Missing applicant fields' }, { status: 400 })
    }

    if (!gun_uid || !officer_email) {
      return NextResponse.json({ error: 'Missing firearm or officer' }, { status: 400 })
    }

    // ✅ Identify logged-in dealer via Bearer token
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

    // ✅ Find officer
    const { data: officerProfile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('auth_uid, email, role')
      .eq('role', 'police.firearmofficer')
      .ilike('email', officer_email)
      .maybeSingle<OfficerProfile>()

    if (profErr) {
      console.error(profErr)
      return NextResponse.json({ error: 'Officer lookup failed' }, { status: 500 })
    }

    if (!officerProfile?.auth_uid || !officerProfile.email) {
      return NextResponse.json({ error: 'Officer not found' }, { status: 400 })
    }

    // ✅ Create application
    // IMPORTANT: set created_by_email so dealer can read it under RLS
    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert({
        applicant_email: dealerEmail,
        created_by_email: dealerEmail, // ✅ FIX
        applicant_name,
        national_id,
        address,
        phone,
        province,
        district,
        gun_uid,
        officer_email: officerProfile.email,
        officer_auth_uid: officerProfile.auth_uid,
        attachments,
        status: 'assigned_to_officer',
      })
      .select('application_uid')
      .single<{ application_uid: string }>()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    const application_uid = String(data.application_uid)

    // ✅ Tracking events
    const { error: evErr } = await supabaseAdmin.from('application_events').insert([
      {
        application_uid,
        from_status: null,
        to_status: 'created',
        action: 'CREATE',
        actor_email: dealerEmail,
        actor_role: 'dealer',
        note: 'Dealer created application',
      },
      {
        application_uid,
        from_status: 'created',
        to_status: 'assigned_to_officer',
        action: 'ASSIGN_TO_OFFICER',
        actor_email: dealerEmail,
        actor_role: 'dealer',
        note: `Assigned to officer ${officerProfile.email}`,
      },
    ])

    if (evErr) {
      console.error(evErr)
      return NextResponse.json({ ok: true, application_uid, warning: 'Tracking insert failed' })
    }

    return NextResponse.json({ ok: true, application_uid })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
