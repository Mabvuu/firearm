// app/police/firearmofficer/application/oic/page.tsx
'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Application = {
  id: number
  applicant_name: string
  oic_email: string | null
  forwarded_by_email: string | null
  forwarded_by_uid: string | null
  status: string
}

type OICPick = {
  email: string
  national_id: string
  auth_uid: string
}

function ApplicationOICPageInner() {
  const searchParams = useSearchParams()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)

  const [oics, setOics] = useState<OICPick[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [query, setQuery] = useState('')

  const [loadingOic, setLoadingOic] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!appId) return

    const load = async () => {
      const {
        data,
        error,
      }: { data: Application | null; error: { message: string } | null } = await supabase
        .from('applications')
        .select('id, applicant_name, oic_email, forwarded_by_email, forwarded_by_uid, status')
        .eq('id', appId)
        .maybeSingle()

      if (error) {
        alert(error.message)
        return
      }

      setApp(data ?? null)
    }

    load()
  }, [appId])

  const loadOICs = async () => {
    setLoadingOic(true)

    const { data, error }: { data: OICPick[] | null; error: { message: string } | null } =
      await supabase
        .from('profiles')
        .select('email, national_id, auth_uid')
        .eq('role', 'police.oic')
        .order('created_at', { ascending: false })

    setLoadingOic(false)

    if (error) {
      alert(error.message)
      return
    }

    setOics(data ?? [])
  }

  const filteredOICs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return oics
    return oics.filter(o =>
      `${o.email} ${o.national_id} ${o.auth_uid}`.toLowerCase().includes(q)
    )
  }, [oics, query])

  const forwardToOIC = async (pick: OICPick) => {
    if (!app) return
    setSending(true)

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user?.email || !user.id) {
      setSending(false)
      alert('Not logged in')
      return
    }

    const { error }: { error: { message: string } | null } = await supabase
      .from('applications')
      .update({
        status: 'forwarded',
        oic_email: pick.email,
        forwarded_by_email: user.email,
        forwarded_by_uid: user.id,
      })
      .eq('id', app.id)

    setSending(false)

    if (error) {
      alert(error.message)
      return
    }

    setApp({
      ...app,
      status: 'forwarded',
      oic_email: pick.email,
      forwarded_by_email: user.email,
      forwarded_by_uid: user.id,
    })

    setShowPicker(false)
  }

  if (!app) return <div className="p-8">Loading…</div>

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <Card>
          <CardHeader>
            <CardTitle>
              Forward to OIC — {app.applicant_name} (#{app.id})
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {app.oic_email ? (
              <div className="text-sm space-y-1">
                <div>
                  <b>Sent to:</b> {app.oic_email}
                </div>
                <div className="text-xs text-muted-foreground">
                  <b>Sent by:</b> {app.forwarded_by_email || '-'} ({app.forwarded_by_uid || '-'})
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = `/police/firearmofficer/application?done=1`)}
                  >
                    Finish
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={() => {
                    setShowPicker(true)
                    if (!oics.length) loadOICs()
                  }}
                  disabled={loadingOic}
                >
                  {loadingOic ? 'Loading OICs…' : 'Choose OIC'}
                </Button>

                {showPicker && (
                  <div className="border rounded p-2 space-y-2">
                    <Input
                      placeholder="Search OIC (email / national id)"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />

                    <div className="max-h-56 overflow-y-auto">
                      {filteredOICs.map(o => (
                        <div
                          key={o.email}
                          className="p-2 cursor-pointer hover:bg-muted flex items-center justify-between"
                          onClick={() => forwardToOIC(o)}
                        >
                          <div>
                            <div className="font-medium">{o.email}</div>
                            <div className="text-xs text-muted-foreground">
                              National ID: {o.national_id} | UID: {o.auth_uid}
                            </div>
                          </div>

                          <Button size="sm" disabled={sending}>
                            {sending ? 'Sending…' : 'Send'}
                          </Button>
                        </div>
                      ))}

                      {!filteredOICs.length && (
                        <div className="text-sm text-muted-foreground p-2">No OIC found.</div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => setShowPicker(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      (window.location.href = `/police/firearmofficer/application/competency?appId=${app.id}`)
                    }
                  >
                    Back
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = `/police/firearmofficer/application?appId=${app.id}`)}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ApplicationOICPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <ApplicationOICPageInner />
    </Suspense>
  )
}
