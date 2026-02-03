import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import crypto from 'crypto'

type Body =
  | { action: 'approve'; applicationId: number; transferOwnership?: boolean }
  | { action: 'decline'; applicationId: number }
  | { action: 'get_wallet'; applicationId: number }

function json(status: number, payload: unknown) {
  return NextResponse.json(payload, { status })
}

function makeWalletId() {
  return crypto.randomBytes(16).toString('hex')
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    if (!body?.applicationId || !('action' in body)) {
      return json(400, { ok: false, error: 'Invalid payload' })
    }

    // 1) Load application (needed for all actions)
    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', body.applicationId)
      .single()

    if (appErr || !app) {
      return json(404, { ok: false, error: 'Application not found' })
    }

    // --------------------
    // GET WALLET (for "View wallet" button)
    // --------------------
    if (body.action === 'get_wallet') {
      // Wallet id is stored in wallet table linked by application_id
      const { data: w, error: wErr } = await supabaseAdmin
        .from('wallet')
        .select('id')
        .eq('application_id', body.applicationId)
        .maybeSingle<{ id: string }>()

      if (wErr) return json(500, { ok: false, error: wErr.message })

      const walletId = (w?.id ?? '').trim()
      if (!walletId) return json(404, { ok: false, error: 'Wallet not found for this application' })

      return json(200, { ok: true, walletId })
    }

    // --------------------
    // DECLINE
    // --------------------
    if (body.action === 'decline') {
      if (app.status === 'approved' || app.status === 'declined') {
        return json(200, { ok: true }) // already final, no action needed
      }

      const { error } = await supabaseAdmin
        .from('applications')
        .update({ status: 'declined' })
        .eq('id', body.applicationId)

      if (error) return json(500, { ok: false, error: error.message })
      return json(200, { ok: true })
    }

    // --------------------
    // APPROVE
    // --------------------
    if (body.action === 'approve') {
      if (app.status === 'approved' || app.status === 'declined') {
        // If already approved, still return walletId so UI can navigate
        const { data: w, error: wErr } = await supabaseAdmin
          .from('wallet')
          .select('id')
          .eq('application_id', body.applicationId)
          .maybeSingle<{ id: string }>()
        if (wErr) return json(500, { ok: false, error: wErr.message })
        const walletId = (w?.id ?? '').trim()
        return json(200, { ok: true, walletId })
      }

      if (!app.gun_uid) {
        return json(400, { ok: false, error: 'Application has no firearm linked' })
      }

      if (!app.applicant_email) {
        return json(400, { ok: false, error: 'Application missing applicant email' })
      }

      // 2) Resolve applicant AUTH UID from email
      const { data: usersRes, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (usersErr) {
        return json(500, { ok: false, error: usersErr.message })
      }

      const user = usersRes.users.find(
        (u) => u.email?.toLowerCase() === String(app.applicant_email).toLowerCase()
      )

      if (!user) {
        return json(400, { ok: false, error: 'Applicant user not found in auth' })
      }

      const applicantUid = user.id

      // 3) Approve application
      const { error: updAppErr } = await supabaseAdmin
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', body.applicationId)

      if (updAppErr) return json(500, { ok: false, error: updAppErr.message })

      // 4) Transfer ownership in inventory
      const { error: invErr } = await supabaseAdmin
        .from('inventory')
        .update({ owner_id: applicantUid })
        .eq('id', app.gun_uid)

      if (invErr) return json(500, { ok: false, error: invErr.message })

      // 5) Create or fetch wallet
      const { data: existingWallet, error: wSelErr } = await supabaseAdmin
        .from('wallet')
        .select('id')
        .eq('application_id', body.applicationId)
        .maybeSingle<{ id: string }>()

      if (wSelErr) return json(500, { ok: false, error: wSelErr.message })

      let walletId = existingWallet?.id

      if (!walletId) {
        const newWalletId = makeWalletId()

        const { data: wIns, error: wInsErr } = await supabaseAdmin
          .from('wallet')
          .insert({
            id: newWalletId,
            application_id: body.applicationId,
            applicant_name: app.applicant_name,
            gun_uid: app.gun_uid,
            created_by_uid: applicantUid,
          })
          .select('id')
          .single<{ id: string }>()

        if (wInsErr) return json(500, { ok: false, error: wInsErr.message })
        walletId = wIns.id
      }

      // 6) Link wallet to gun
      const { error: wgErr } = await supabaseAdmin
        .from('wallet_guns')
        .upsert(
          {
            wallet_id: walletId,
            gun_uid: app.gun_uid,
            application_id: body.applicationId,
          },
          { onConflict: 'wallet_id,gun_uid' }
        )

      if (wgErr) return json(500, { ok: false, error: wgErr.message })

      return json(200, { ok: true, walletId })
    }

    return json(400, { ok: false, error: 'Unknown action' })
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? e.message : String(e)
    return json(500, { ok: false, error: msg })
  }
}
