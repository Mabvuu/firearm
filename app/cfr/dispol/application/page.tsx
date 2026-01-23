// app/cfr/dispol/application/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
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

  // flow tracking
  dispol_email: string | null
  cfr_forwarded_by_email: string | null
  cfr_forwarded_by_uid: string | null

  oic_approved_by_email: string | null
  oic_approved_by_uid: string | null

  cfr_notes: string | null

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

const statusColor = (status: string) => {
  switch (status) {
    case 'sent_to_dispol':
      return 'bg-green-500'
    case 'returned':
    case 'declined':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

export default function CFRDispolApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [guns, setGuns] = useState<Record<number, Gun | null>>({})
  const [competencies, setCompetencies] = useState<Record<number, CompetencyFull | null>>(
    {}
  )
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
        .select('*')
        .eq('dispol_email', user.email)
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
    const bucket = path.startsWith('applications/')
      ? 'applications'
      : 'application-attachments'
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const renderCompetency = (c: CompetencyFull) => {
    const row = (label: string, ok: boolean, details: string | null) => (
      <div className="border rounded p-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">{label}</div>
          <Badge variant={ok ? 'destructive' : 'outline'}>{ok ? 'Yes' : 'No'}</Badge>
        </div>
        {ok && (details ?? '').trim() ? (
          <div className="text-xs text-muted-foreground mt-1">Details: {details}</div>
        ) : null}
      </div>
    )

    return (
      <div className="space-y-2 text-sm">
        <div>
          <b>{c.full_name}</b> — {c.national_id}
        </div>
        <div className="grid gap-2">
          {row('Violent Crime History', c.violent_crime_history, c.violent_crime_details)}
          {row('Restraining Orders', c.restraining_orders, c.restraining_order_details)}
          {row('Mental Instability', c.mental_instability, c.mental_instability_details)}
          {row('Substance Abuse', c.substance_abuse, c.substance_abuse_details)}
          {row('Firearm Training', c.firearms_training, c.firearms_training_details)}
          {row('Threat to Self/Others', c.threat_to_self_or_others, c.threat_details)}
        </div>
        <div className="border rounded p-2">
          <div className="font-medium">Officer Notes</div>
          <div className="text-xs text-muted-foreground mt-1">{c.notes || '-'}</div>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8">Loading…</div>

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <Card>
          <CardHeader>
            <CardTitle>CFR District Police Inbox</CardTitle>
          </CardHeader>

          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {apps.map(app => {
                const gun = app.gun_uid ? guns[app.gun_uid] : null
                const comp = app.competency_id ? competencies[app.competency_id] : null

                return (
                  <AccordionItem key={app.id} value={String(app.id)}>
                    <AccordionTrigger className="flex items-center gap-3 px-4">
                      <div className={`w-2 h-8 rounded ${statusColor(app.status)}`} />
                      <div className="flex-1 text-left">
                        <div className="font-medium">
                          {app.applicant_name}{' '}
                          <span className="text-xs text-muted-foreground"># {app.id}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Dealer: {app.applicant_email}
                        </div>
                      </div>
                      <Badge variant="outline">{app.status}</Badge>
                    </AccordionTrigger>

                    <AccordionContent className="p-4 space-y-4">
                      {/* Who it came from */}
                      <div className="border rounded p-3 text-sm space-y-1">
                        <div>
                          <b>Approved by OIC:</b> {app.oic_approved_by_email || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          OIC UID: {app.oic_approved_by_uid || '-'}
                        </div>
                        <div className="pt-2">
                          <b>Forwarded by CFR:</b> {app.cfr_forwarded_by_email || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          CFR UID: {app.cfr_forwarded_by_uid || '-'}
                        </div>
                      </div>

                      {/* Applicant */}
                      <div className="border rounded p-3 space-y-2">
                        <div className="font-semibold">Applicant Details</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><b>National ID:</b> {app.national_id}</div>
                          <div><b>Phone:</b> {app.phone}</div>
                          <div><b>Address:</b> {app.address}</div>
                          <div><b>Province:</b> {app.province}</div>
                          <div><b>District:</b> {app.district}</div>
                        </div>
                      </div>

                      {/* Firearm */}
                      <div className="border rounded p-3">
                        <div className="font-semibold mb-1">Firearm Details</div>
                        {!app.gun_uid ? (
                          <div className="text-sm text-muted-foreground">No firearm linked.</div>
                        ) : gun ? (
                          <div className="text-sm space-y-1">
                            <div>Make: {gun.make}</div>
                            <div>Model: {gun.model}</div>
                            <div>Caliber: {gun.caliber}</div>
                            <div>Serial: {gun.serial}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Loading firearm…</div>
                        )}
                      </div>

                      {/* Attachments */}
                      <div className="border rounded p-3 space-y-2">
                        <div className="font-semibold">Attachments</div>

                        {app.attachments?.length ? (
                          <ul className="text-sm list-disc ml-5">
                            {app.attachments.map(a => (
                              <li key={a}>
                                <a
                                  href={getFileUrl(a)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                >
                                  {a.split('/').pop()}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No documents attached
                          </div>
                        )}
                      </div>

                      {/* CFR Notes */}
                      <div className="border rounded p-3 space-y-2">
                        <div className="font-semibold">CFR Notes</div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {app.cfr_notes?.trim() ? app.cfr_notes : '-'}
                        </div>
                      </div>

                      {/* Competency */}
                      <div className="border rounded p-3 space-y-2">
                        <div className="font-semibold">Competency</div>

                        {!app.competency_id ? (
                          <div className="text-sm text-muted-foreground">No competency attached.</div>
                        ) : comp ? (
                          renderCompetency(comp)
                        ) : (
                          <div className="text-sm text-muted-foreground">Loading competency…</div>
                        )}
                      </div>

                      {/* Next */}
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() =>
                            (window.location.href =
                              `/cfr/dispol/application/add-attachment?appId=${app.id}`)
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
