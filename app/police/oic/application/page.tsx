// app/police/oic/application/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Application = {
  id: number
  applicant_name: string
  applicant_email: string
  national_id: string
  address: string
  phone: string
  province: string
  district: string
  gun_uid: number | null
  status: string
  attachments: string[] | null
  competency_id: number | null

  oic_email: string | null
  forwarded_by_email: string | null
  forwarded_by_uid: string | null

  created_at?: string
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
  user_id: string
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
  'id, user_id, full_name, national_id, violent_crime_history, violent_crime_details, restraining_orders, restraining_order_details, mental_instability, mental_instability_details, substance_abuse, substance_abuse_details, firearms_training, firearms_training_details, threat_to_self_or_others, threat_details, notes, created_at'

// 🎨 palette
const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

const statusDot = (status: string) => {
  switch (status) {
    case 'unread':
      return 'bg-blue-500'
    case 'forwarded':
      return 'bg-green-500'
    case 'returned':
    case 'declined':
      return 'bg-red-500'
    case 'approved_by_oic':
      return 'bg-green-500'
    default:
      return 'bg-gray-400'
  }
}

export default function OICApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [guns, setGuns] = useState<Record<number, Gun | null>>({})
  const [competencies, setCompetencies] = useState<Record<number, CompetencyFull | null>>({})
  const [loading, setLoading] = useState(true)

  const [actingId, setActingId] = useState<number | null>(null)

  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | undefined>(undefined)

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
        .select('*')
        .eq('oic_email', user.email)
        .order('created_at', { ascending: false })

      if (!error) setApps((data as Application[]) || [])
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

      setGuns(prev => ({
        ...prev,
        [gunId]: error ? null : ((data as Gun) ?? null),
      }))
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

      setCompetencies(prev => ({
        ...prev,
        [compId]: error ? null : ((data as CompetencyFull) ?? null),
      }))
    }

    apps.forEach(a => {
      if (a.competency_id) loadCompetency(a.competency_id)
    })
  }, [apps])

  const getFileUrl = (path: string) => {
    const bucket = path.startsWith('applications/') ? 'applications' : 'application-attachments'
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const renderCompetency = (c: CompetencyFull) => {
    const row = (label: string, ok: boolean, details: string | null) => (
      <div className="py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium" style={{ color: COLORS.blackBlue }}>
            {label}
          </div>
          <Badge
            variant="outline"
            style={{
              borderColor: COLORS.naturalAluminum,
              backgroundColor: ok ? COLORS.blackBlue : '#fff',
              color: ok ? COLORS.snowWhite : COLORS.blackBlue,
            }}
          >
            {ok ? 'Yes' : 'No'}
          </Badge>
        </div>
        {ok && (details ?? '').trim() ? (
          <div className="mt-1 text-xs whitespace-pre-wrap" style={{ color: COLORS.coolGreyMedium }}>
            {details}
          </div>
        ) : null}
      </div>
    )

    return (
      <div className="text-sm">
        <div className="pb-2 border-b" style={{ borderColor: COLORS.naturalAluminum }}>
          <div className="font-semibold" style={{ color: COLORS.blackBlue }}>
            {c.full_name}
          </div>
          <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
            {c.national_id}
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
          {row('Violent Crime History', c.violent_crime_history, c.violent_crime_details)}
          {row('Restraining Orders', c.restraining_orders, c.restraining_order_details)}
          {row('Mental Instability', c.mental_instability, c.mental_instability_details)}
          {row('Substance Abuse', c.substance_abuse, c.substance_abuse_details)}
          {row('Firearm Training', c.firearms_training, c.firearms_training_details)}
          {row('Threat to Self/Others', c.threat_to_self_or_others, c.threat_details)}
          <div className="py-2">
            <div className="text-sm font-medium" style={{ color: COLORS.blackBlue }}>
              Officer Notes
            </div>
            <div className="mt-1 text-xs whitespace-pre-wrap" style={{ color: COLORS.coolGreyMedium }}>
              {c.notes || '—'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return apps
    return apps.filter(a =>
      `${a.id} ${a.applicant_name} ${a.applicant_email} ${a.national_id} ${a.status}`
        .toLowerCase()
        .includes(q)
    )
  }, [apps, query])

  const counts = filteredApps.length

  const declineApp = async (appId: number) => {
    setActingId(appId)
    const { error } = await supabase.from('applications').update({ status: 'declined' }).eq('id', appId)
    setActingId(null)

    if (error) return alert(error.message)

    setApps(prev => prev.map(a => (a.id === appId ? { ...a, status: 'declined' } : a)))
  }

  const approveApp = async (appId: number) => {
    setActingId(appId)
    const { error } = await supabase.from('applications').update({ status: 'approved_by_oic' }).eq('id', appId)
    setActingId(null)

    if (error) return alert(error.message)

    setApps(prev => prev.map(a => (a.id === appId ? { ...a, status: 'approved_by_oic' } : a)))
    window.location.href = `/police/oic/application/approval?appId=${appId}`
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
      <div className="w-1/4 min-w-[260px]" style={{ borderRight: `1px solid ${COLORS.naturalAluminum}` }}>
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        {/* compact header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
              OIC Inbox
            </h1>
            <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
              Applications assigned to you ({counts})
            </p>
          </div>

          <div className="w-[320px] max-w-full">
            <Input
              className="h-10"
              placeholder="Search applicant / email / id / status"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <Card style={{ borderColor: COLORS.naturalAluminum }}>
          <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
            <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
              Inbox
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4">
            {filteredApps.length === 0 ? (
              <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                No applications.
              </div>
            ) : (
              <Accordion
                type="single"
                collapsible
                value={openId}
                onValueChange={setOpenId}
                className="space-y-2"
              >
                {filteredApps.map(app => {
                  const gun = app.gun_uid ? guns[app.gun_uid] : null
                  const comp = app.competency_id ? competencies[app.competency_id] : null

                  return (
                    <AccordionItem
                      key={app.id}
                      value={String(app.id)}
                      className="border rounded-md"
                      style={{ borderColor: COLORS.naturalAluminum }}
                    >
                      <AccordionTrigger className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-2 h-8 rounded ${statusDot(app.status)}`} />

                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium truncate" style={{ color: COLORS.blackBlue }}>
                            {app.applicant_name}{' '}
                            <span className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
                              # {app.id}
                            </span>
                          </div>
                          <div className="text-xs truncate" style={{ color: COLORS.coolGreyMedium }}>
                            Dealer: {app.applicant_email}
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                        >
                          {app.status}
                        </Badge>
                      </AccordionTrigger>

                      <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
                        {/* Forwarder */}
                        <div className="rounded-md border p-3" style={{ borderColor: COLORS.naturalAluminum }}>
                          <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                            Forwarded to you by
                          </div>
                          <div className="text-sm mt-1" style={{ color: COLORS.blackBlue }}>
                            {app.forwarded_by_email || '—'}
                          </div>
                          <div className="text-xs mt-1" style={{ color: COLORS.coolGreyMedium }}>
                            UID: {app.forwarded_by_uid || '—'}
                          </div>
                        </div>

                        {/* Applicant */}
                        <section
                          className="rounded-md border"
                          style={{ borderColor: COLORS.naturalAluminum }}
                        >
                          <div
                            className="px-3 py-2 border-b text-sm font-semibold"
                            style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                          >
                            Applicant
                          </div>

                          <div className="p-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <Line label="National ID" value={app.national_id} />
                              <Line label="Phone" value={app.phone} />
                              <Line label="Address" value={app.address} />
                              <Line label="Province" value={app.province} />
                              <Line label="District" value={app.district} />
                            </div>
                          </div>
                        </section>

                        {/* Firearm */}
                        <section className="rounded-md border" style={{ borderColor: COLORS.naturalAluminum }}>
                          <div
                            className="px-3 py-2 border-b text-sm font-semibold"
                            style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                          >
                            Firearm
                          </div>

                          <div className="p-3 text-sm">
                            {!app.gun_uid ? (
                              <div style={{ color: COLORS.coolGreyMedium }}>No firearm linked.</div>
                            ) : gun ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <Line label="Make" value={gun.make} />
                                <Line label="Model" value={gun.model} />
                                <Line label="Caliber" value={gun.caliber ?? '—'} />
                                <Line label="Serial" value={gun.serial ?? '—'} />
                              </div>
                            ) : (
                              <div style={{ color: COLORS.coolGreyMedium }}>Loading firearm…</div>
                            )}
                          </div>
                        </section>

                        {/* Attachments */}
                        <section className="rounded-md border" style={{ borderColor: COLORS.naturalAluminum }}>
                          <div
                            className="px-3 py-2 border-b text-sm font-semibold"
                            style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                          >
                            Attachments
                          </div>

                          <div className="p-3 text-sm">
                            {app.attachments?.length ? (
                              <ul className="space-y-1">
                                {app.attachments.map(a => (
                                  <li key={a} className="flex items-center justify-between gap-3">
                                    <a
                                      href={getFileUrl(a)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="underline truncate"
                                      style={{ color: COLORS.blackBlue }}
                                    >
                                      {a.split('/').pop()}
                                    </a>
                                    <span className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
                                      open
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div style={{ color: COLORS.coolGreyMedium }}>No documents attached.</div>
                            )}
                          </div>
                        </section>

                        {/* Competency */}
                        <section className="rounded-md border" style={{ borderColor: COLORS.naturalAluminum }}>
                          <div
                            className="px-3 py-2 border-b text-sm font-semibold"
                            style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                          >
                            Competency
                          </div>

                          <div className="p-3">
                            {!app.competency_id ? (
                              <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                                No competency attached.
                              </div>
                            ) : comp ? (
                              renderCompetency(comp)
                            ) : (
                              <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                                Loading competency…
                              </div>
                            )}
                          </div>
                        </section>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            variant="destructive"
                            className="h-11"
                            disabled={actingId === app.id}
                            onClick={() => declineApp(app.id)}
                          >
                            {actingId === app.id ? 'Working…' : 'Decline'}
                          </Button>

                          <Button
                            className="h-11"
                            style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                            disabled={actingId === app.id}
                            onClick={() => approveApp(app.id)}
                          >
                            {actingId === app.id ? 'Working…' : 'Approve'}
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

function Line({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-1" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
      <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
        {label}
      </div>
      <div className="text-sm text-right" style={{ color: COLORS.blackBlue }}>
        {(value ?? '').trim() ? value : '—'}
      </div>
    </div>
  )
}
