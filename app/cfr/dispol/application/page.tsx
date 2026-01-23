// app/cfr/dispol/application/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

type Application = {
  id: number
  applicant_name: string | null
  applicant_email: string
  national_id: string | null
  address: string | null
  phone: string | null
  province: string | null
  district: string | null
  gun_uid: number | null
  status: string
  attachments: string[] | null
  competency_id: number | null

  dispol_email: string | null
  cfr_forwarded_by_email: string | null
  cfr_forwarded_by_uid: string | null

  oic_approved_by_email: string | null
  oic_approved_by_uid: string | null

  cfr_notes: string | null
  created_at: string
}

type Gun = {
  id: number
  make: string
  model: string
  caliber: string | null
  serial: string | null
}

type CompetencyFull = {
  id: number
  full_name: string
  national_id: string
  violent_crime_history: boolean
  violent_crime_details: string | null
  restraining_orders: boolean
  restraining_order_details: string | null
  mental_instability: boolean
  mental_instability_details: string | null
  substance_abuse: boolean
  substance_abuse_details: string | null
  firearms_training: boolean
  firearms_training_details: string | null
  threat_to_self_or_others: boolean
  threat_details: string | null
  notes: string | null
  created_at: string
}

const competencySelect =
  'id, full_name, national_id, violent_crime_history, violent_crime_details, restraining_orders, restraining_order_details, mental_instability, mental_instability_details, substance_abuse, substance_abuse_details, firearms_training, firearms_training_details, threat_to_self_or_others, threat_details, notes, created_at'

const statusPill = (status: string) => {
  const s = (status || '').toLowerCase()
  if (['declined', 'returned'].includes(s)) {
    return { bg: 'rgba(239,68,68,0.16)', fg: '#991b1b', border: 'rgba(239,68,68,0.35)', dot: '#ef4444' }
  }
  if (['sent_to_dispol', 'approved_by_oic', 'sent_to_cfr'].includes(s)) {
    return { bg: 'rgba(34,197,94,0.16)', fg: '#166534', border: 'rgba(34,197,94,0.35)', dot: '#22c55e' }
  }
  return { bg: 'rgba(59,130,246,0.14)', fg: '#1e3a8a', border: 'rgba(59,130,246,0.35)', dot: '#3b82f6' }
}

export default function CFRDispolApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [guns, setGuns] = useState<Record<number, Gun | null>>({})
  const [competencies, setCompetencies] = useState<Record<number, CompetencyFull | null>>({})
  const [loading, setLoading] = useState(true)

  const requestedGunIds = useRef<Set<number>>(new Set())
  const requestedCompIds = useRef<Set<number>>(new Set())

  useEffect(() => {
    const loadApps = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select(
          'id, applicant_name, applicant_email, national_id, address, phone, province, district, gun_uid, status, attachments, competency_id, dispol_email, cfr_forwarded_by_email, cfr_forwarded_by_uid, oic_approved_by_email, oic_approved_by_uid, cfr_notes, created_at'
        )
        .eq('dispol_email', user.email)
        .order('created_at', { ascending: false })

      if (!error) setApps((data as Application[]) ?? [])
      setLoading(false)
    }

    loadApps()
  }, [])

  useEffect(() => {
    const loadGun = async (gunId: number) => {
      if (requestedGunIds.current.has(gunId)) return
      requestedGunIds.current.add(gunId)

      const { data, error } = await supabase
        .from('inventory')
        .select('id, make, model, caliber, serial')
        .eq('id', gunId)
        .maybeSingle()

      setGuns(prev => ({ ...prev, [gunId]: error ? null : ((data as Gun) ?? null) }))
    }

    apps.forEach(a => {
      if (a.gun_uid) loadGun(a.gun_uid)
    })
  }, [apps])

  useEffect(() => {
    const loadCompetency = async (compId: number) => {
      if (requestedCompIds.current.has(compId)) return
      requestedCompIds.current.add(compId)

      const { data, error } = await supabase
        .from('competency')
        .select(competencySelect)
        .eq('id', compId)
        .maybeSingle()

      setCompetencies(prev => ({ ...prev, [compId]: error ? null : ((data as CompetencyFull) ?? null) }))
    }

    apps.forEach(a => {
      if (a.competency_id) loadCompetency(a.competency_id)
    })
  }, [apps])

  const getFileUrl = (path: string) => {
    const bucket = path.startsWith('applications/') ? 'applications' : 'application-attachments'
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const counts = useMemo(() => {
    const total = apps.length
    const pending = apps.filter(a => !['declined', 'returned'].includes((a.status || '').toLowerCase())).length
    const declined = apps.filter(a => (a.status || '').toLowerCase() === 'declined').length
    const returned = apps.filter(a => (a.status || '').toLowerCase() === 'returned').length
    return { total, pending, declined, returned }
  }, [apps])

  const miniRow = (label: string, value: string) => (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="text-[12px]" style={{ color: COLORS.coolGreyMedium }}>{label}</div>
      <div className="text-[12px] text-right" style={{ color: COLORS.blackBlue }}>{value || '-'}</div>
    </div>
  )

  const renderCompetencyCompact = (c: CompetencyFull) => {
    const item = (n: number, label: string, ok: boolean, details: string | null) => (
      <div className="py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm" style={{ color: COLORS.blackBlue }}>
            <span style={{ color: COLORS.coolGreyMedium }}>{n}.</span> {label}
          </div>
          <span
            className="text-[11px] px-2 py-1 rounded border"
            style={{
              borderColor: ok ? 'rgba(239,68,68,0.35)' : COLORS.naturalAluminum,
              backgroundColor: ok ? 'rgba(239,68,68,0.12)' : 'transparent',
              color: ok ? '#991b1b' : COLORS.blackBlue,
            }}
          >
            {ok ? 'Yes' : 'No'}
          </span>
        </div>
        {ok && (details ?? '').trim() ? (
          <div className="mt-1 text-[12px]" style={{ color: COLORS.coolGreyMedium }}>
            {details}
          </div>
        ) : null}
      </div>
    )

    return (
      <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
        <div className="px-3 py-2 border-b" style={{ borderColor: COLORS.naturalAluminum }}>
          <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
            {c.full_name} — {c.national_id}
          </div>
          <div className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
            Competency record #{c.id}
          </div>
        </div>
        <div className="px-3 divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
          {item(1, 'Violent crime history', c.violent_crime_history, c.violent_crime_details)}
          {item(2, 'Restraining orders', c.restraining_orders, c.restraining_order_details)}
          {item(3, 'Mental instability', c.mental_instability, c.mental_instability_details)}
          {item(4, 'Substance abuse', c.substance_abuse, c.substance_abuse_details)}
          {item(5, 'Firearm training', c.firearms_training, c.firearms_training_details)}
          {item(6, 'Threat to self/others', c.threat_to_self_or_others, c.threat_details)}
        </div>
        <div className="px-3 py-3 border-t" style={{ borderColor: COLORS.naturalAluminum }}>
          <div className="text-xs font-semibold" style={{ color: COLORS.blackBlue }}>Officer notes</div>
          <div className="text-[12px] mt-1 whitespace-pre-wrap" style={{ color: COLORS.coolGreyMedium }}>
            {c.notes?.trim() ? c.notes : '-'}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8" style={{ backgroundColor: COLORS.snowWhite, color: COLORS.blackBlue }}>
        Loading…
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.snowWhite }}>
      <div
        className="w-1/4 min-w-[260px]"
        style={{ borderRight: `1px solid ${COLORS.naturalAluminum}` }}
      >
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
              District Police Inbox
            </h1>
            <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
              Assigned: {counts.total} • Pending: {counts.pending} • Declined: {counts.declined} • Returned: {counts.returned}
            </p>
          </div>
        </div>

        <Card style={{ borderColor: COLORS.naturalAluminum }}>
          <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
            <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
              Applications
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4">
            {apps.length === 0 ? (
              <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                No applications assigned to you.
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {apps.map(app => {
                  const pill = statusPill(app.status)
                  const gun = app.gun_uid ? guns[app.gun_uid] : null
                  const comp = app.competency_id ? competencies[app.competency_id] : null

                  return (
                    <AccordionItem
                      key={app.id}
                      value={String(app.id)}
                      className="border rounded-md"
                      style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
                    >
                      <AccordionTrigger className="px-3 py-2 hover:no-underline">
                        <div className="w-full flex items-center gap-3">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: pill.dot }}
                          />
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <div className="font-medium truncate" style={{ color: COLORS.blackBlue }}>
                                {app.applicant_name || app.applicant_email}
                              </div>
                              <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
                                #{app.id}
                              </div>
                            </div>
                            <div className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                              {new Date(app.created_at).toLocaleString()}
                            </div>
                          </div>

                          <span
                            className="text-[11px] px-2 py-1 rounded border"
                            style={{
                              backgroundColor: pill.bg,
                              borderColor: pill.border,
                              color: pill.fg,
                              textTransform: 'lowercase',
                            }}
                          >
                            {app.status}
                          </span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-3 pb-3 pt-1">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {/* meta */}
                          <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
                            <div className="px-3 py-2 border-b text-sm font-semibold" style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}>
                              Routing
                            </div>
                            <div className="px-3 py-2">
                              {miniRow('Approved by OIC', app.oic_approved_by_email || '-')}
                              {miniRow('OIC UID', app.oic_approved_by_uid || '-')}
                              <div className="h-px my-2" style={{ backgroundColor: COLORS.naturalAluminum }} />
                              {miniRow('Forwarded by CFR', app.cfr_forwarded_by_email || '-')}
                              {miniRow('CFR UID', app.cfr_forwarded_by_uid || '-')}
                            </div>
                          </div>

                          {/* applicant */}
                          <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
                            <div className="px-3 py-2 border-b text-sm font-semibold" style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}>
                              Applicant
                            </div>
                            <div className="px-3 py-2">
                              {miniRow('National ID', app.national_id || '-')}
                              {miniRow('Phone', app.phone || '-')}
                              {miniRow('Province', app.province || '-')}
                              {miniRow('District', app.district || '-')}
                              <div className="h-px my-2" style={{ backgroundColor: COLORS.naturalAluminum }} />
                              {miniRow('Address', app.address || '-')}
                            </div>
                          </div>
                        </div>

                        {/* firearm + attachments */}
                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
                            <div className="px-3 py-2 border-b text-sm font-semibold" style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}>
                              Firearm
                            </div>
                            <div className="px-3 py-2">
                              {!app.gun_uid ? (
                                <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                                  No firearm linked.
                                </div>
                              ) : gun ? (
                                <>
                                  {miniRow('Make', gun.make)}
                                  {miniRow('Model', gun.model)}
                                  {miniRow('Caliber', gun.caliber || '-')}
                                  {miniRow('Serial', gun.serial || '-')}
                                </>
                              ) : (
                                <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                                  Loading firearm…
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
                            <div className="px-3 py-2 border-b text-sm font-semibold" style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}>
                              Attachments
                            </div>
                            <div className="px-3 py-2">
                              {app.attachments?.length ? (
                                <ul className="divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
                                  {app.attachments.map(a => (
                                    <li key={a} className="py-2 flex items-center justify-between gap-3">
                                      <a
                                        href={getFileUrl(a)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="truncate underline text-sm"
                                        style={{ color: COLORS.blackBlue }}
                                      >
                                        {a.split('/').pop()}
                                      </a>
                                      <span className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                                        file
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                                  No documents attached.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* CFR notes */}
                        <div className="mt-3 rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
                          <div className="px-3 py-2 border-b text-sm font-semibold" style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}>
                            CFR Notes
                          </div>
                          <div className="px-3 py-2 text-sm whitespace-pre-wrap" style={{ color: COLORS.coolGreyMedium }}>
                            {app.cfr_notes?.trim() ? app.cfr_notes : '-'}
                          </div>
                        </div>

                        {/* competency */}
                        <div className="mt-3">
                          {!app.competency_id ? (
                            <div className="rounded-md border bg-white p-3 text-sm" style={{ borderColor: COLORS.naturalAluminum, color: COLORS.coolGreyMedium }}>
                              No competency attached.
                            </div>
                          ) : comp ? (
                            renderCompetencyCompact(comp)
                          ) : (
                            <div className="rounded-md border bg-white p-3 text-sm" style={{ borderColor: COLORS.naturalAluminum, color: COLORS.coolGreyMedium }}>
                              Loading competency…
                            </div>
                          )}
                        </div>

                        {/* NEXT */}
                        <div className="flex justify-end pt-3">
                          <Button
                            className="h-11 text-base"
                            style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                            onClick={() => (window.location.href = `/cfr/dispol/application/add-attachment?appId=${app.id}`)}
                          >
                            Next
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
