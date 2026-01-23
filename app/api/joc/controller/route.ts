// app/api/joc/controller/decision/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: 'approve' | 'decline'
      applicationId: number
    }

    if (!body?.action || !body?.applicationId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Load application (we need gun_uid + applicant info)
    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('id, gun_uid, applicant_name, national_id, status')
      .eq('id', body.applicationId)
      .maybeSingle()

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 400 })
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (!app.gun_uid) return NextResponse.json({ error: 'No gun linked to application' }, { status: 400 })

    // Fetch current inventory owner (for history)
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('inventory')
      .select('id, owner_name, owner_national_id, ownership_state')
      .eq('id', app.gun_uid)
      .maybeSingle()

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })
    if (!inv) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })

    // DECLINE
    if (body.action === 'decline') {
      const { error: updAppErr } = await supabaseAdmin
        .from('applications')
        .update({ status: 'declined' })
        .eq('id', app.id)

      if (updAppErr) return NextResponse.json({ error: updAppErr.message }, { status: 400 })

      // return inventory to dealer state
      const { error: updInvErr } = await supabaseAdmin
        .from('inventory')
        .update({
          ownership_state: 'DEALER',
          pending_application_uid: null,
          last_transfer_at: new Date().toISOString(),
        })
        .eq('id', app.gun_uid)

      if (updInvErr) return NextResponse.json({ error: updInvErr.message }, { status: 400 })

      // history
      await supabaseAdmin.from('inventory_ownership_history').insert({
        inventory_id: app.gun_uid,
        from_owner_type: inv.ownership_state ?? 'DEALER',
        from_owner_name: inv.owner_name,
        from_owner_national_id: inv.owner_national_id,
        to_owner_type: 'DEALER',
        to_owner_name: inv.owner_name,
        to_owner_national_id: inv.owner_national_id,
        application_uid: String(app.id),
        action: 'DECLINED',
      })

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // APPROVE
    const newOwnerId = (app.national_id ?? '').trim()
    const newOwnerName = (app.applicant_name ?? '').trim()

    if (!newOwnerId) return NextResponse.json({ error: 'Missing applicant national_id' }, { status: 400 })
    if (!newOwnerName) return NextResponse.json({ error: 'Missing applicant name' }, { status: 400 })

    // 1) create / update wallet
    const { error: walletErr } = await supabaseAdmin.from('wallet').upsert(
      { id: newOwnerId, applicant_name: newOwnerName },
      { onConflict: 'id' }
    )
    if (walletErr) return NextResponse.json({ error: walletErr.message }, { status: 400 })

    // 2) link gun to wallet
    const { error: linkErr } = await supabaseAdmin.from('wallet_guns').insert({
      wallet_id: newOwnerId,
      gun_uid: app.gun_uid,
      application_id: app.id,
    })
    if (linkErr && !linkErr.message?.toLowerCase().includes('duplicate')) {
      return NextResponse.json({ error: linkErr.message }, { status: 400 })
    }

    // 3) update inventory owner -> applicant
    const { error: updInvErr } = await supabaseAdmin
      .from('inventory')
      .update({
        ownership_state: 'CIVILIAN',
        owner_name: newOwnerName,
        owner_national_id: newOwnerId,
        pending_application_uid: null,
        last_transfer_at: new Date().toISOString(),
      })
      .eq('id', app.gun_uid)

    if (updInvErr) return NextResponse.json({ error: updInvErr.message }, { status: 400 })

    // 4) approve application
    const { error: updAppErr } = await supabaseAdmin
      .from('applications')
      .update({ status: 'approved' })
      .eq('id', app.id)

    if (updAppErr) return NextResponse.json({ error: updAppErr.message }, { status: 400 })

    // 5) history
    await supabaseAdmin.from('inventory_ownership_history').insert({
      inventory_id: app.gun_uid,
      from_owner_type: inv.ownership_state ?? 'DEALER',
      from_owner_name: inv.owner_name,
      from_owner_national_id: inv.owner_national_id,
      to_owner_type: 'CIVILIAN',
      to_owner_name: newOwnerName,
      to_owner_national_id: newOwnerId,
      application_uid: String(app.id),
      action: 'APPROVED',
    })

    return NextResponse.json({ ok: true, walletId: newOwnerId }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
