// app/joc/mid/application/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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

  // police
  oic_approved_by_email: string | null
  oic_approved_by_uid: string | null

  // cfr
  cfr_email: string | null
  cfr_forwarded_by_email: string | null
  cfr_forwarded_by_uid: string | null
  cfr_notes: string | null

  // dispol
  dispol_email: string | null
  dispol_notes: string | null
  dispol_forwarded_by_email: string | null
  dispol_forwarded_by_uid: string | null

  // propol
  propol_email: string | null
  propol_notes: string | null
  propol_forwarded_by_email: string | null
  propol_forwarded_by_uid: string | null

  // joc
  joc_oic_email: string | null
  joc_oic_notes: string | null
  joc_mid_email: string | null

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
  full_name: string
  national_id: string
  notes: string | null
}

const competencySelect = 'id, full_name, national_id, notes'

const statusColor = (status: string) => {
  switch (status) {
    case 'sent_to_joc_mid':
      return 'bg-green-500'
    case 'returned':
    case 'declined':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

export default function JOCMIDApplicationsPage() {
  const router = useRouter()

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

      const { data } = await supabase
        .from('applications')
        .select('*')
        .eq('joc_mid_email', user.email)
        .order('created_at', { ascending: false })

      setApps((data as Application[]) || [])
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

  if (loading) return <div className="p-8">Loading…</div>

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <Card>
          <CardHeader>
            <CardTitle>JOC MID Inbox</CardTitle>
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
                      {/* CHAIN */}
                      <div className="border rounded p-3 text-sm space-y-2">
                        <div><b>Police OIC Approved:</b> {app.oic_approved_by_email || '-'}</div>

                        <div className="pt-2">
                          <b>CFR Forwarded:</b> {app.cfr_forwarded_by_email || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          CFR UID: {app.cfr_forwarded_by_uid || '-'}
                        </div>

                        <div className="pt-2">
                          <b>District (Dispol):</b> {app.dispol_forwarded_by_email || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Dispol UID: {app.dispol_forwarded_by_uid || '-'}
                        </div>

                        <div className="pt-2">
                          <b>Province (Propol):</b> {app.propol_forwarded_by_email || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Propol UID: {app.propol_forwarded_by_uid || '-'}
                        </div>

                        <div className="pt-2">
                          <b>JOC OIC:</b> {app.joc_oic_email || '-'}
                        </div>
                      </div>

                      {/* APPLICANT */}
                      <div className="border rounded p-3 space-y-2">
                        <div className="font-semibold">Applicant</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><b>National ID:</b> {app.national_id}</div>
                          <div><b>Phone:</b> {app.phone}</div>
                          <div><b>Address:</b> {app.address}</div>
                          <div><b>Province:</b> {app.province}</div>
                          <div><b>District:</b> {app.district}</div>
                        </div>
                      </div>

                      {/* FIREARM */}
                      <div className="border rounded p-3">
                        <div className="font-semibold mb-1">Firearm</div>
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

                      {/* ATTACHMENTS */}
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
                          <div className="text-sm text-muted-foreground">No documents attached</div>
                        )}
                      </div>

                      {/* NOTES */}
                      <div className="border rounded p-3 space-y-3">
                        <div className="font-semibold">Notes (All Stages)</div>

                        <div className="text-sm">
                          <b>Competency:</b>
                          <div className="text-muted-foreground whitespace-pre-wrap">
                            {comp?.notes?.trim() ? comp.notes : '-'}
                          </div>
                        </div>

                        <div className="text-sm">
                          <b>CFR:</b>
                          <div className="text-muted-foreground whitespace-pre-wrap">
                            {app.cfr_notes?.trim() ? app.cfr_notes : '-'}
                          </div>
                        </div>

                        <div className="text-sm">
                          <b>Dispol:</b>
                          <div className="text-muted-foreground whitespace-pre-wrap">
                            {app.dispol_notes?.trim() ? app.dispol_notes : '-'}
                          </div>
                        </div>

                        <div className="text-sm">
                          <b>Propol:</b>
                          <div className="text-muted-foreground whitespace-pre-wrap">
                            {app.propol_notes?.trim() ? app.propol_notes : '-'}
                          </div>
                        </div>

                        <div className="text-sm">
                          <b>JOC OIC:</b>
                          <div className="text-muted-foreground whitespace-pre-wrap">
                            {app.joc_oic_notes?.trim() ? app.joc_oic_notes : '-'}
                          </div>
                        </div>
                      </div>

                      {/* ACTION */}
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() =>
                            router.push(`/joc/mid/application/add-notes?appId=${app.id}`)
                          }
                        >
                          Proceed
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
