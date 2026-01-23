// app/joc/oic/application/approval/page.tsx
'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
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
  joc_mid_email: string | null
}

type Pick = {
  email: string
  national_id: string
  auth_uid: string
}

function PickJocMidPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  useEffect(() => {
    if (missingAppId) return

    const load = async () => {
      setLoadingApp(true)
      setErrorMsg(null)

      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, status, joc_mid_email')
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

  useEffect(() => {
    const loadPeople = async () => {
      setLoadingList(true)
      setErrorMsg(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('email, national_id, auth_uid')
        .eq('role', 'joc.mid')
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return people
    return people.filter(p =>
      `${p.email} ${p.national_id} ${p.auth_uid}`.toLowerCase().includes(q)
    )
  }, [people, query])

  const sendToJocMid = async (pick: Pick) => {
    if (!app) return

    setSendingTo(pick.email)
    setErrorMsg(null)

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
        status: 'sent_to_joc_mid',
        joc_mid_email: pick.email,
        joc_oic_forwarded_by_email: user.email,
        joc_oic_forwarded_by_uid: user.id,
      })
      .eq('id', app.id)

    setSendingTo(null)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push('/joc/oic/application')
  }

  const derivedError = missingAppId ? 'Missing appId in URL.' : null
  const displayError = errorMsg ?? derivedError
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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-semibold tracking-tight">Assign JOC MID</h1>
                <Badge variant="outline">JOC Officer In Charge</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {missingAppId
                  ? 'Open this page from an application (it needs appId).'
                  : app
                  ? `${app.applicant_name} — #${app.id}`
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
                onClick={() => router.push('/joc/oic/application')}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>

          {displayError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Choose JOC MID Officer</CardTitle>
                <Badge variant="secondary">
                  {loadingList ? 'Loading…' : `${filtered.length} / ${people.length}`}
                </Badge>
              </div>
              <Separator />
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                placeholder="Search: email, national id, uid…"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                disabled={loadingList || missingAppId}
              />

              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="max-h-[460px] overflow-y-auto">
                  {loadingList ? (
                    <div className="p-4 text-sm text-muted-foreground">Loading users…</div>
                  ) : filtered.length ? (
                    <div className="divide-y">
                      {filtered.map(p => {
                        const isSending = sendingTo === p.email
                        return (
                          <div
                            key={p.email}
                            className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30"
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

                            <Button
                              size="sm"
                              onClick={() => sendToJocMid(p)}
                              disabled={!!sendingTo || !app || missingAppId}
                            >
                              {isSending ? 'Sending…' : 'Assign & Send'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">No joc.mid users found.</div>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Tip: Assigning will forward the application to the selected JOC MID.
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

export default function PickJocMidPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <PickJocMidPageInner />
    </Suspense>
  )
}
