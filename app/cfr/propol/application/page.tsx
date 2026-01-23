// app/cfr/propol/application/page.tsx
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

  forwarded_by_email: string | null
  forwarded_by_uid: string | null
  oic_approved_by_email: string | null
  oic_approved_by_uid: string | null

  cfr_forwarded_by_email: string | null
  cfr_forwarded_by_uid: string | null
  cfr_notes: string | null

  dispol_email: string | null
  dispol_notes: string | null
  dispol_forwarded_by_email: string | null
  dispol_forwarded_by_uid: string | null

  propol_email: string | null
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
    case 'approved_by_propol':
      return 'default'
    case 'sent_to_propol':
      return 'secondary'
    case 'returned':
    case 'declined':
    case 'propol_declined':
      return 'destructive'
    default:
      return 'outline'
  }
}

const statusDotClass = (status: string) => {
  switch (status) {
    case 'approved_by_propol':
      return 'bg-emerald-500'
    case 'sent_to_propol':
      return 'bg-blue-500'
    case 'returned':
    case 'declined':
    case 'propol_declined':
      return 'bg-rose-500'
    default:
      return 'bg-zinc-400'
  }
}

const formatDateTime = (iso?: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export default function CFRPropolApplicationsPage() {
  const router = useRouter()

  const [apps, setApps] = useState<Application[]>([])
  const [guns, setGuns] = useState<Record<number, Gun | null>>({})
  const [competencies, setCompetencies] = useState<Record<number, CompetencyFull | null>>({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const requestedGunIds = useRef<Set<number>>(new Set())
  const requestedCompIds = useRef<Set<number>>(new Set())

  useEffect(() => {
    const loadApps = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        setApps([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('propol_email', user.email)
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return apps

    return apps.filter(a => {
      const gun = a.gun_uid ? guns[a.gun_uid] : null
      return (
        String(a.id).includes(q) ||
        (a.applicant_name || '').toLowerCase().includes(q) ||
        (a.applicant_email || '').toLowerCase().includes(q) ||
        (a.national_id || '').toLowerCase().includes(q) ||
        (a.phone || '').toLowerCase().includes(q) ||
        (a.status || '').toLowerCase().includes(q) ||
        (a.province || '').toLowerCase().includes(q) ||
        (a.district || '').toLowerCase().includes(q) ||
        (gun?.serial || '').toLowerCase().includes(q) ||
        (gun?.make || '').toLowerCase().includes(q) ||
        (gun?.model || '').toLowerCase().includes(q)
      )
    })
  }, [apps, guns, query])

  const getFileUrl = (path: string) => {
    const bucket = path.startsWith('applications/') ? 'applications' : 'application-attachments'
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const Field = ({
    label,
    value,
  }: {
    label: string
    value: React.ReactNode
  }) => (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium break-words">{value}</div>
    </div>
  )

  const InfoGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  )

  const row = (label: string, ok: boolean, details: string | null) => (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{label}</div>
        <Badge variant={ok ? 'destructive' : 'outline'}>{ok ? 'Yes' : 'No'}</Badge>
      </div>
      {ok && (details ?? '').trim() ? (
        <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
          {details}
        </div>
      ) : null}
    </div>
  )

  const renderCompetency = (c: CompetencyFull) => (
    <div className="space-y-4">
      <div className="rounded-lg border p-3">
        <div className="text-sm font-semibold">Competency Summary</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {c.full_name} — {c.national_id}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {row('Violent Crime History', c.violent_crime_history, c.violent_crime_details)}
        {row('Restraining Orders', c.restraining_orders, c.restraining_order_details)}
        {row('Mental Instability', c.mental_instability, c.mental_instability_details)}
        {row('Substance Abuse', c.substance_abuse, c.substance_abuse_details)}
        {row('Firearm Training', c.firearms_training, c.firearms_training_details)}
        {row('Threat to Self/Others', c.threat_to_self_or_others, c.threat_details)}
      </div>

      <div className="rounded-lg border p-3">
        <div className="text-sm font-semibold">Officer Notes (Competency)</div>
        <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
          {c.notes?.trim() ? c.notes : '-'}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
          <NavPage />
        </aside>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl p-6 lg:p-8">
            <div className="rounded-lg border p-6">
              <div className="text-sm text-muted-foreground">Loading applications…</div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
        <NavPage />
      </aside>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Province Police Inbox</h1>
              <p className="text-sm text-muted-foreground">
                Review assigned applications and proceed to attachments.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search: name, ID, status, serial…"
                className="sm:w-[320px]"
              />
              <div className="text-xs text-muted-foreground sm:text-right">
                Showing <span className="font-medium text-foreground">{filtered.length}</span> of{' '}
                <span className="font-medium text-foreground">{apps.length}</span>
              </div>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Applications</CardTitle>
                <Badge variant="outline">{apps.length} total</Badge>
              </div>
              <Separator />
            </CardHeader>

            <CardContent className="space-y-3">
              {filtered.length === 0 ? (
                <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                  No applications found.
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-3">
                  {filtered.map(app => {
                    const gun = app.gun_uid ? guns[app.gun_uid] : null
                    const comp = app.competency_id ? competencies[app.competency_id] : null

                    return (
                      <AccordionItem
                        key={app.id}
                        value={String(app.id)}
                        className="rounded-lg border bg-background px-0"
                      >
                        <AccordionTrigger className="px-4 py-4 hover:no-underline">
                          <div className="flex w-full items-start gap-3">
                            <div className="mt-1 flex items-center gap-3">
                              <div className={`h-10 w-1.5 rounded-full ${statusDotClass(app.status)}`} />
                            </div>

                            <div className="flex-1 text-left">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <div className="text-sm font-semibold">
                                  {app.applicant_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  #{app.id}
                                </div>
                              </div>

                              <div className="mt-1 text-xs text-muted-foreground">
                                Dealer: {app.applicant_email || '-'}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant={statusBadgeVariant(app.status)} className="capitalize">
                                  {toLabel(app.status)}
                                </Badge>

                                <Badge variant="outline">
                                  Created: {formatDateTime(app.created_at)}
                                </Badge>

                                {app.gun_uid ? (
                                  <Badge variant="outline">Gun ID: {app.gun_uid}</Badge>
                                ) : (
                                  <Badge variant="outline">No firearm</Badge>
                                )}
                              </div>
                            </div>

                            <div className="pt-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={e => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  router.push(`/cfr/propol/application/add-attachment?appId=${app.id}`)
                                }}
                              >
                                Continue
                              </Button>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-4 pb-5">
                          <div className="space-y-6">
                            {/* Applicant */}
                            <div className="rounded-lg border p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">Applicant</div>
                                <Badge variant="outline">{app.national_id}</Badge>
                              </div>
                              <Separator className="my-3" />
                              <InfoGrid>
                                <Field label="Full name" value={app.applicant_name || '-'} />
                                <Field label="Dealer email" value={app.applicant_email || '-'} />
                                <Field label="Phone" value={app.phone || '-'} />
                                <Field label="Address" value={app.address || '-'} />
                                <Field label="Province" value={app.province || '-'} />
                                <Field label="District" value={app.district || '-'} />
                              </InfoGrid>
                            </div>

                            {/* Workflow / chain */}
                            <div className="rounded-lg border p-4">
                              <div className="text-sm font-semibold">Workflow trail</div>
                              <Separator className="my-3" />
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-md border p-3">
                                  <div className="text-xs text-muted-foreground">Forwarded by Firearm Officer</div>
                                  <div className="mt-1 text-sm font-medium">{app.forwarded_by_email || '-'}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">UID: {app.forwarded_by_uid || '-'}</div>
                                </div>

                                <div className="rounded-md border p-3">
                                  <div className="text-xs text-muted-foreground">Approved by OIC</div>
                                  <div className="mt-1 text-sm font-medium">{app.oic_approved_by_email || '-'}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">UID: {app.oic_approved_by_uid || '-'}</div>
                                </div>

                                <div className="rounded-md border p-3">
                                  <div className="text-xs text-muted-foreground">Forwarded by CFR</div>
                                  <div className="mt-1 text-sm font-medium">{app.cfr_forwarded_by_email || '-'}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">UID: {app.cfr_forwarded_by_uid || '-'}</div>
                                </div>

                                <div className="rounded-md border p-3">
                                  <div className="text-xs text-muted-foreground">Forwarded by District (Dispol)</div>
                                  <div className="mt-1 text-sm font-medium">{app.dispol_forwarded_by_email || '-'}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">UID: {app.dispol_forwarded_by_uid || '-'}</div>
                                </div>
                              </div>
                            </div>

                            {/* Firearm */}
                            <div className="rounded-lg border p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">Firearm</div>
                                <Badge variant="outline">{app.gun_uid ? `#${app.gun_uid}` : 'Not linked'}</Badge>
                              </div>
                              <Separator className="my-3" />

                              {!app.gun_uid ? (
                                <div className="text-sm text-muted-foreground">No firearm linked.</div>
                              ) : gun ? (
                                <InfoGrid>
                                  <Field label="Make" value={gun.make || '-'} />
                                  <Field label="Model" value={gun.model || '-'} />
                                  <Field label="Caliber" value={gun.caliber || '-'} />
                                  <Field label="Serial" value={gun.serial || '-'} />
                                </InfoGrid>
                              ) : (
                                <div className="text-sm text-muted-foreground">Loading firearm…</div>
                              )}
                            </div>

                            {/* Attachments */}
                            <div className="rounded-lg border p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">Attachments</div>
                                <Badge variant="outline">{app.attachments?.length ?? 0}</Badge>
                              </div>
                              <Separator className="my-3" />

                              {app.attachments?.length ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {app.attachments.map(a => (
                                    <a
                                      key={a}
                                      href={getFileUrl(a)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="group flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/40"
                                    >
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium group-hover:underline">
                                          {a.split('/').pop()}
                                        </div>
                                        <div className="truncate text-xs text-muted-foreground">
                                          {a}
                                        </div>
                                      </div>
                                      <Badge variant="outline">View</Badge>
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">No documents attached.</div>
                              )}
                            </div>

                            {/* Notes */}
                            <div className="rounded-lg border p-4">
                              <div className="text-sm font-semibold">Notes</div>
                              <Separator className="my-3" />
                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-md border p-3">
                                  <div className="text-xs text-muted-foreground">Competency notes</div>
                                  <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                    {comp?.notes?.trim() ? comp.notes : '-'}
                                  </div>
                                </div>

                                <div className="rounded-md border p-3">
                                  <div className="text-xs text-muted-foreground">CFR notes</div>
                                  <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                    {app.cfr_notes?.trim() ? app.cfr_notes : '-'}
                                  </div>
                                </div>

                                <div className="rounded-md border p-3">
                                  <div className="text-xs text-muted-foreground">District notes (Dispol)</div>
                                  <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                    {app.dispol_notes?.trim() ? app.dispol_notes : '-'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Competency */}
                            <div className="rounded-lg border p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">Competency</div>
                                <Badge variant="outline">
                                  {app.competency_id ? `#${app.competency_id}` : 'Not linked'}
                                </Badge>
                              </div>
                              <Separator className="my-3" />

                              {!app.competency_id ? (
                                <div className="text-sm text-muted-foreground">No competency attached.</div>
                              ) : comp ? (
                                renderCompetency(comp)
                              ) : (
                                <div className="text-sm text-muted-foreground">Loading competency…</div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-xs text-muted-foreground">
                                Use “Continue” to attach docs and proceed.
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => router.push('/cfr/propol')}
                                >
                                  Back
                                </Button>
                                <Button
                                  onClick={() =>
                                    router.push(
                                      `/cfr/propol/application/add-attachment?appId=${app.id}`
                                    )
                                  }
                                >
                                  Continue
                                </Button>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* Mobile nav hint (optional) */}
          <div className="md:hidden rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            Tip: Open this page on a wider screen to see the sidebar navigation.
          </div>
        </div>
      </main>
    </div>
  )
}
