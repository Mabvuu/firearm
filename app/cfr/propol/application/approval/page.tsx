// app/cfr/propol/application/approval/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type Application = {
  id: number
  applicant_name: string
  status: string
  joc_oic_email: string | null
}

type Pick = {
  email: string
  national_id: string
  auth_uid: string
}

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
    case 'sent_to_joc_oic':
      return 'secondary'
    case 'propol_declined':
    case 'declined':
    case 'returned':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default function PropolApprovalPickJocOicPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // IMPORTANT: don't setState in effects for missing appId (eslint rule)
  const appIdRaw = searchParams.get('appId')
  const appId = Number(appIdRaw)
  const missingAppId = !appIdRaw || Number.isNaN(appId) || appId <= 0

  const [app, setApp] = useState<Application | null>(null)
  const [people, setPeople] = useState<Pick[]>([])
  const [query, setQuery] = useState('')

  const [loadingApp, setLoadingApp] = useState(false)
  const [loadingList, setLoadingList] = useState(false)

  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Fetch app only if appId is valid
  useEffect(() => {
    if (missingAppId) return

    const load = async () => {
      setLoadingApp(true)
      setErrorMsg(null)

      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, status, joc_oic_email')
        .eq('id', appId)
        .single()

      setLoadingApp(false)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setApp((data as Application) ?? null)
    }

    load()
  }, [appId, missingAppId])

  // Load people list
  useEffect(() => {
    const loadPeople = async () => {
      setLoadingList(true)
      setErrorMsg(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('email, national_id, auth_uid')
        .eq('role', 'joc.oic')
        .order('created_at', { ascending: false })

      setLoadingList(false)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setPeople((data as Pick[]) ?? [])
    }

    loadPeople()
  }, [])

  // Derived (no effect, no setState) error display for missing appId
  const derivedError = missingAppId ? 'Missing appId' : null
  const displayError = errorMsg ?? derivedError

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return people
    return people.filter(p =>
      `${p.email} ${p.national_id} ${p.auth_uid}`.toLowerCase().includes(q)
    )
  }, [people, query])

  const sendToJocOic = async (pick: Pick) => {
    if (!app) return

    setSendingTo(pick.email)
    setErrorMsg(null)
    setSuccessMsg(null)

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user?.email || !user.id) {
      setSendingTo(null)
      setErrorMsg('Not logged in')
      return
    }

    const { error } = await supabase
      .from('applications')
      .update({
        status: 'sent_to_joc_oic',
        joc_oic_email: pick.email,
        propol_forwarded_by_email: user.email,
        propol_forwarded_by_uid: user.id,
      })
      .eq('id', app.id)

    setSendingTo(null)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setSuccessMsg(`Sent to ${pick.email}.`)
    router.push('/cfr/propol/application')
  }

  const busy = loadingApp || loadingList

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
        <NavPage />
      </aside>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Province Approval
                </h1>
                <Badge variant="outline">Assign JOC OIC</Badge>
                {app?.status ? (
                  <Badge
                    variant={statusBadgeVariant(app.status)}
                    className="capitalize"
                  >
                    {toLabel(app.status)}
                  </Badge>
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">
                {missingAppId
                  ? 'Missing appId in URL.'
                  : app
                  ? `${app.applicant_name} — #${app.id}${
                      app.joc_oic_email ? ` • Current: ${app.joc_oic_email}` : ''
                    }`
                  : busy
                  ? 'Loading application…'
                  : 'Application not found.'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()} disabled={busy}>
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/cfr/propol/application')}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>

          {(displayError || successMsg) && (
            <Alert variant={displayError ? 'destructive' : 'default'}>
              <AlertTitle>{displayError ? 'Error' : 'Done'}</AlertTitle>
              <AlertDescription>{displayError ?? successMsg}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">Select an OIC (joc.oic)</CardTitle>
              <Separator />
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                placeholder="Search: email, national id, uid…"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuery(e.target.value)
                }
                disabled={loadingList || missingAppId}
              />

              <div className="rounded-lg border bg-background">
                <div className="max-h-[420px] overflow-y-auto">
                  {loadingList ? (
                    <div className="p-4 text-sm text-muted-foreground">Loading users…</div>
                  ) : filtered.length ? (
                    <div className="divide-y">
                      {filtered.map(p => {
                        const isSending = sendingTo === p.email
                        return (
                          <div
                            key={p.email}
                            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{p.email}</div>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="rounded-md border px-2 py-0.5">
                                  National ID: {p.national_id || '-'}
                                </span>
                                <span className="rounded-md border px-2 py-0.5">
                                  UID: {p.auth_uid || '-'}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => sendToJocOic(p)}
                                disabled={!!sendingTo || !app || missingAppId}
                              >
                                {isSending ? 'Sending…' : 'Assign & Send'}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No joc.oic users found.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>{loadingList ? '—' : `Showing ${filtered.length} of ${people.length}`}</div>
                <div>Click “Assign & Send” to forward the application.</div>
              </div>
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
