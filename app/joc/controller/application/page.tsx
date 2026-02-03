// app/joc/controller/application/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
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

  cfr_notes: string | null
  dispol_notes: string | null
  propol_notes: string | null
  joc_oic_notes: string | null
  joc_mid_notes: string | null

  joc_controller_email: string | null
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
  notes: string | null
}

const competencySelect = 'id, full_name, notes'

const statusColor = (status: string) => {
  switch (status) {
    case 'sent_to_joc_controller':
    case 'approved':
      return 'bg-green-500'
    case 'returned':
    case 'declined':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

type DecisionResponse = { ok?: boolean; error?: string; walletId?: string }

export default function JOCControllerApplicationsPage() {
  const router = useRouter()

  const [apps, setApps] = useState<Application[]>([])
  const [guns, setGuns] = useState<Record<number, Gun | null>>({})
  const [competencies, setCompetencies] = useState<Record<number, CompetencyFull | null>>({})
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [actingId, setActingId] = useState<number | null>(null)

  const requestedGunIds = useRef<Set<number>>(new Set())
  const requestedCompIds = useRef<Set<number>>(new Set())

  const isFinalStatus = (status: string) => status === 'approved' || status === 'declined'

  useEffect(() => {
    const loadApps = async () => {
      setLoading(true)
      setErrorMsg(null)

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr && userErr.message !== 'Auth session missing!') {
        setErrorMsg(userErr.message)
        setLoading(false)
        return
      }

      if (!user?.email) {
        setErrorMsg('Not logged in')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('joc_controller_email', user.email)
        .order('created_at', { ascending: false })

      if (error) {
        setErrorMsg(error.message)
        setApps([])
        setLoading(false)
        return
      }

      setApps((data as Application[]) || [])
      setLoading(false)
    }

    void loadApps()
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

      setGuns((prev) => ({ ...prev, [gunId]: error ? null : ((data as Gun) ?? null) }))
    }

    apps.forEach((a) => {
      if (a.gun_uid) void loadGun(a.gun_uid)
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

      setCompetencies((prev) => ({
        ...prev,
        [compId]: error ? null : ((data as CompetencyFull) ?? null),
      }))
    }

    apps.forEach((a) => {
      if (a.competency_id) void loadCompetency(a.competency_id)
    })
  }, [apps])

  const getFileUrl = (path: string) => {
    const bucket = path.startsWith('applications/') ? 'applications' : 'application-attachments'
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const updateLocalStatus = (appId: number, status: string) => {
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)))
  }

  const safeJson = async (res: Response): Promise<DecisionResponse> => {
    const txt = await res.text()
    if (!txt) return {}
    try {
      return JSON.parse(txt) as DecisionResponse
    } catch {
      return {}
    }
  }

  const pushWallet = (walletIdRaw: string) => {
    const walletId = walletIdRaw.trim()
    if (!walletId) return
    router.push(`/joc/controller/wallet?walletId=${encodeURIComponent(walletId)}`)
  }

  const handleViewWallet = async (applicationId: number) => {
    try {
      setActingId(applicationId)
      setErrorMsg(null)

      const res = await fetch('/api/joc/controller/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_wallet', applicationId }),
      })

      const data = await safeJson(res)
      if (!res.ok || data?.ok === false) {
        setErrorMsg(data?.error || 'Wallet not found')
        return
      }

      const walletId = (data.walletId ?? '').trim()
      if (walletId) pushWallet(walletId)
      else setErrorMsg('Wallet not found')
    } catch (e) {
      console.error(e)
      setErrorMsg('Wallet not found')
    } finally {
      setActingId(null)
    }
  }

  const handleDecline = async (appId: number) => {
    const app = apps.find((a) => a.id === appId)
    if (app && isFinalStatus(app.status)) return

    try {
      setActingId(appId)
      setErrorMsg(null)

      const res = await fetch('/api/joc/controller/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline', applicationId: appId }),
      })

      const data = await safeJson(res)
      if (!res.ok || data?.ok === false) {
        setErrorMsg(data?.error || 'Decline failed')
        return
      }

      updateLocalStatus(appId, 'declined')
    } catch (e) {
      console.error(e)
      setErrorMsg('Decline failed')
    } finally {
      setActingId(null)
    }
  }

  const handleAcceptMakeWallet = async (appRow: Application) => {
    const app = apps.find((a) => a.id === appRow.id)
    if (app && isFinalStatus(app.status)) return

    try {
      setActingId(appRow.id)
      setErrorMsg(null)

      const res = await fetch('/api/joc/controller/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', applicationId: appRow.id, transferOwnership: true }),
      })

      const data = await safeJson(res)
      if (!res.ok || data?.ok === false) {
        setErrorMsg(data?.error || 'Approve failed')
        return
      }

      updateLocalStatus(appRow.id, 'approved')

      const walletId = (data.walletId ?? '').trim()
      if (walletId) {
        pushWallet(walletId)
      } else {
        router.refresh()
      }
    } catch (e) {
      console.error(e)
      setErrorMsg('Approve failed')
    } finally {
      setActingId(null)
    }
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
            <CardTitle>JOC Controller Inbox</CardTitle>
          </CardHeader>

          <CardContent>
            {errorMsg && <div className="border rounded p-3 text-sm text-red-600 mb-4">{errorMsg}</div>}

            {!errorMsg && !apps.length && (
              <div className="border rounded p-3 text-sm text-muted-foreground">
                No applications assigned to your email in <b>applications.joc_controller_email</b>.
              </div>
            )}

            {!!apps.length && (
              <Accordion type="single" collapsible className="space-y-2">
                {apps.map((app) => {
                  const gun = app.gun_uid ? guns[app.gun_uid] : null
                  const comp = app.competency_id ? competencies[app.competency_id] : null
                  const isBusy = actingId === app.id
                  const isFinal = isFinalStatus(app.status)

                  return (
                    <AccordionItem key={app.id} value={String(app.id)}>
                      <AccordionTrigger className="flex items-center gap-3 px-4">
                        <div className={`w-2 h-8 rounded ${statusColor(app.status)}`} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">
                            {app.applicant_name}{' '}
                            <span className="text-xs text-muted-foreground"># {app.id}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">Applicant: {app.applicant_email}</div>
                        </div>
                        <Badge variant="outline">{app.status}</Badge>
                      </AccordionTrigger>

                      <AccordionContent className="p-4 space-y-4">
                        <div className="border rounded p-3 space-y-2">
                          <div className="font-semibold">Applicant</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <b>National ID:</b> {app.national_id}
                            </div>
                            <div>
                              <b>Phone:</b> {app.phone}
                            </div>
                            <div>
                              <b>Address:</b> {app.address}
                            </div>
                            <div>
                              <b>Province:</b> {app.province}
                            </div>
                            <div>
                              <b>District:</b> {app.district}
                            </div>
                          </div>
                        </div>

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

                        <div className="border rounded p-3 space-y-2">
                          <div className="font-semibold">Attachments</div>
                          {app.attachments?.length ? (
                            <ul className="text-sm list-disc ml-5">
                              {app.attachments.map((a) => (
                                <li key={a}>
                                  <a href={getFileUrl(a)} target="_blank" rel="noreferrer" className="underline">
                                    {a.split('/').pop()}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-muted-foreground">No documents attached</div>
                          )}
                        </div>

                        <div className="border rounded p-3 space-y-3">
                          <div className="font-semibold">All Notes</div>

                          <div className="text-sm">
                            <b>Competency:</b>
                            <div className="text-muted-foreground whitespace-pre-wrap">{comp?.notes?.trim() ? comp.notes : '-'}</div>
                          </div>

                          <div className="text-sm">
                            <b>CFR:</b>
                            <div className="text-muted-foreground whitespace-pre-wrap">{app.cfr_notes?.trim() ? app.cfr_notes : '-'}</div>
                          </div>

                          <div className="text-sm">
                            <b>Dispol:</b>
                            <div className="text-muted-foreground whitespace-pre-wrap">{app.dispol_notes?.trim() ? app.dispol_notes : '-'}</div>
                          </div>

                          <div className="text-sm">
                            <b>Propol:</b>
                            <div className="text-muted-foreground whitespace-pre-wrap">{app.propol_notes?.trim() ? app.propol_notes : '-'}</div>
                          </div>

                          <div className="text-sm">
                            <b>JOC OIC:</b>
                            <div className="text-muted-foreground whitespace-pre-wrap">{app.joc_oic_notes?.trim() ? app.joc_oic_notes : '-'}</div>
                          </div>

                          <div className="text-sm">
                            <b>JOC MID:</b>
                            <div className="text-muted-foreground whitespace-pre-wrap">{app.joc_mid_notes?.trim() ? app.joc_mid_notes : '-'}</div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          {app.status === 'declined' && (
                            <Button variant="secondary" disabled>
                              Denied
                            </Button>
                          )}

                          {app.status === 'approved' && (
                            <>
                              <Button variant="secondary" disabled>
                                Approved
                              </Button>
                              <Button disabled={isBusy} onClick={() => void handleViewWallet(app.id)}>
                                {isBusy ? 'Working…' : 'View wallet'}
                              </Button>
                            </>
                          )}

                          {!isFinal && (
                            <>
                              <Button variant="destructive" disabled={isBusy} onClick={() => void handleDecline(app.id)}>
                                {isBusy ? 'Working…' : 'Decline'}
                              </Button>

                              <Button disabled={isBusy} onClick={() => void handleAcceptMakeWallet(app)}>
                                {isBusy ? 'Working…' : 'Accept & Transfer Ownership'}
                              </Button>
                            </>
                          )}
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
