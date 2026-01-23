// app/joc/oic/application/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

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

  // police chain
  forwarded_by_email: string | null
  forwarded_by_uid: string | null
  oic_email: string | null
  forwarded_by_email_oic?: string | null
  forwarded_by_uid_oic?: string | null
  oic_approved_by_email: string | null
  oic_approved_by_uid: string | null

  // cfr chain
  cfr_email: string | null
  cfr_forwarded_by_email: string | null
  cfr_forwarded_by_uid: string | null
  cfr_notes: string | null

  // dispol chain
  dispol_email: string | null
  dispol_notes: string | null
  dispol_forwarded_by_email: string | null
  dispol_forwarded_by_uid: string | null

  // provincial police chain (stored as propol)
  propol_email: string | null
  propol_notes: string | null
  propol_forwarded_by_email: string | null
  propol_forwarded_by_uid: string | null

  // JOC routing
  joc_oic_email: string | null
  joc_oic_notes?: string | null

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

const toLabel = (raw: string) =>
  raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase())
    .trim()

const statusBadgeVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'sent_to_joc_oic':
      return 'secondary'
    case 'approved_by_joc_oic':
      return 'default'
    case 'declined':
    case 'returned':
    case 'joc_oic_declined':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default function JOCOICApplicationsPage() {
  const router = useRouter()

  const [apps, setApps] = useState<Application[]>([])
  const [guns, setGuns] = useState<Record<number, Gun | null>>({})
  const [competencies, setCompetencies] = useState<Record<number, CompetencyFull | null>>({})
  const [loading, setLoading] = useState(true)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const requestedGunIds = useRef<Set<number>>(new Set())
  const requestedCompIds = useRef<Set<number>>(new Set())

  useEffect(() => {
    const loadApps = async () => {
      setLoading(true)
      setErrorMsg(null)

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user?.email) {
        setLoading(false)
        setErrorMsg('Not logged in')
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('joc_oic_email', user.email)
        .order('created_at', { ascending: false })

      if (error) setErrorMsg(error.message)
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

  // ✅ ALWAYS applications bucket
  const getFileUrl = (path: string) =>
    supabase.storage.from('applications').getPublicUrl(path).data.publicUrl

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return apps
    return apps.filter(a =>
      `${a.id} ${a.applicant_name} ${a.applicant_email} ${a.national_id} ${a.status}`
        .toLowerCase()
        .includes(q)
    )
  }, [apps, query])

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
        <NavPage />
      </aside>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Applications
                </h1>
                <Badge variant="outline">JOC Officer In Charge</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Review applications assigned to you and forward after approval.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary">{apps.length} total</Badge>
              <Badge variant="outline">{filteredApps.length} shown</Badge>
            </div>
          </div>

          <Separator />

          {errorMsg && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-sm">
            <CardHeader className="space-y-3">
              <CardTitle className="text-base">Inbox</CardTitle>

              <Input
                placeholder="Search: name, email, national id, status, id…"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuery(e.target.value)
                }
                disabled={loading}
              />
            </CardHeader>

            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground p-2">Loading…</div>
              ) : !filteredApps.length ? (
                <div className="text-sm text-muted-foreground p-2">
                  No applications found.
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredApps.map(app => {
                    const gun = app.gun_uid ? guns[app.gun_uid] : null
                    const comp = app.competency_id ? competencies[app.competency_id] : null

                    return (
                      <AccordionItem
                        key={app.id}
                        value={String(app.id)}
                        className="rounded-lg border bg-background px-0"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex w-full items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="truncate font-semibold">
                                  {app.applicant_name}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  #{app.id}
                                </span>
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                Dealer: {app.applicant_email}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Badge variant={statusBadgeVariant(app.status)}>
                                {toLabel(app.status)}
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
                          {/* Chain */}
                          <div className="rounded-lg border p-4 space-y-2 text-sm">
                            <div className="font-semibold">Chain</div>

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

                            <div className="pt-2">
                              <b>Forwarded by District (Dispol):</b>{' '}
                              {app.dispol_forwarded_by_email || '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Dispol UID: {app.dispol_forwarded_by_uid || '-'}
                            </div>

                            <div className="pt-2">
                              <b>Forwarded by Provincial Police:</b>{' '}
                              {app.propol_forwarded_by_email || '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Provincial Police UID: {app.propol_forwarded_by_uid || '-'}
                            </div>
                          </div>

                          {/* Applicant */}
                          <div className="rounded-lg border p-4 space-y-2">
                            <div className="font-semibold">Applicant</div>
                            <div className="grid gap-2 text-sm sm:grid-cols-2">
                              <div><b>National ID:</b> {app.national_id}</div>
                              <div><b>Phone:</b> {app.phone}</div>
                              <div className="sm:col-span-2"><b>Address:</b> {app.address}</div>
                              <div><b>Province:</b> {app.province}</div>
                              <div><b>District:</b> {app.district}</div>
                            </div>
                          </div>

                          {/* Firearm */}
                          <div className="rounded-lg border p-4">
                            <div className="font-semibold mb-2">Firearm</div>
                            {!app.gun_uid ? (
                              <div className="text-sm text-muted-foreground">No firearm linked.</div>
                            ) : gun ? (
                              <div className="grid gap-2 text-sm sm:grid-cols-2">
                                <div><b>Make:</b> {gun.make}</div>
                                <div><b>Model:</b> {gun.model}</div>
                                <div><b>Caliber:</b> {gun.caliber || '-'}</div>
                                <div><b>Serial:</b> {gun.serial || '-'}</div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">Loading firearm…</div>
                            )}
                          </div>

                          {/* Attachments */}
                          <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">Attachments</div>
                              <Badge variant="outline">{app.attachments?.length ?? 0}</Badge>
                            </div>

                            {app.attachments?.length ? (
                              <ul className="text-sm list-disc ml-5 space-y-1">
                                {app.attachments.map(a => (
                                  <li key={a}>
                                    <a
                                      href={getFileUrl(a)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="underline underline-offset-2"
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

                          {/* Notes */}
                          <div className="rounded-lg border p-4 space-y-3">
                            <div className="font-semibold">Notes (All Roles)</div>

                            <div className="text-sm">
                              <b>Competency Notes:</b>
                              <div className="text-muted-foreground whitespace-pre-wrap">
                                {comp?.notes?.trim() ? comp.notes : '-'}
                              </div>
                            </div>

                            <div className="text-sm">
                              <b>CFR Notes:</b>
                              <div className="text-muted-foreground whitespace-pre-wrap">
                                {app.cfr_notes?.trim() ? app.cfr_notes : '-'}
                              </div>
                            </div>

                            <div className="text-sm">
                              <b>District Notes (Dispol):</b>
                              <div className="text-muted-foreground whitespace-pre-wrap">
                                {app.dispol_notes?.trim() ? app.dispol_notes : '-'}
                              </div>
                            </div>

                            <div className="text-sm">
                              <b>Provincial Police Notes:</b>
                              <div className="text-muted-foreground whitespace-pre-wrap">
                                {app.propol_notes?.trim() ? app.propol_notes : '-'}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button
                              variant="outline"
                              onClick={() =>
                                router.push(`/joc/oic/application/add-notes?appId=${app.id}`)
                              }
                            >
                              Add Notes / Attachments
                            </Button>

                            <Button
                              onClick={() =>
                                router.push(`/joc/oic/application/add-notes?appId=${app.id}`)
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
              )}
            </CardContent>
          </Card>

          <div className="md:hidden rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            Tip: Use a wider screen to see the sidebar navigation.
          </div>
        </div>
      </main>
    </div>
  )
}
