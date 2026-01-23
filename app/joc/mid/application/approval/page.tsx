// app/joc/mid/application/approval/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Application = {
  id: number
  applicant_name: string
  status: string
  joc_controller_email: string | null
}

type Pick = {
  email: string
  national_id: string
  auth_uid: string
}

export default function JOCMIDPickControllerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [people, setPeople] = useState<Pick[]>([])
  const [query, setQuery] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!appId) return

    const load = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, status, joc_controller_email')
        .eq('id', appId)
        .single()

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setApp((data as Application) ?? null)
    }

    load()
  }, [appId])

  useEffect(() => {
    const loadPeople = async () => {
      setLoadingList(true)
      setErrorMsg(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('email, national_id, auth_uid')
        .eq('role', 'joc.controller')
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

  const sendToController = async (pick: Pick) => {
    if (!app) return
    setSending(true)
    setErrorMsg(null)

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user?.email || !user.id) {
      setSending(false)
      setErrorMsg('Not logged in')
      return
    }

    const { error } = await supabase
      .from('applications')
      .update({
        status: 'sent_to_joc_controller',
        joc_controller_email: pick.email,
        joc_mid_forwarded_by_email: user.email,
        joc_mid_forwarded_by_uid: user.id,
      })
      .eq('id', app.id)

    setSending(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push('/joc/mid/application')
  }

  if (!app && !errorMsg) return <div className="p-8">Loading…</div>

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <Card>
          <CardHeader>
            <CardTitle>
              JOC MID → Choose JOC Controller
              {app ? ` — ${app.applicant_name} (#${app.id})` : ''}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="border rounded p-3 text-sm text-red-600">{errorMsg}</div>
            )}

            <Input
              placeholder="Search (email / national id / uid)"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />

            <div className="border rounded">
              <div className="max-h-72 overflow-y-auto">
                {filtered.map(p => (
                  <div
                    key={p.email}
                    className="p-2 cursor-pointer hover:bg-muted flex items-center justify-between"
                    onClick={() => sendToController(p)}
                  >
                    <div>
                      <div className="font-medium">{p.email}</div>
                      <div className="text-xs text-muted-foreground">
                        National ID: {p.national_id} | UID: {p.auth_uid}
                      </div>
                    </div>

                    <Button size="sm" disabled={sending}>
                      {sending ? 'Sending…' : 'Send'}
                    </Button>
                  </div>
                ))}

                {!filtered.length && (
                  <div className="p-2 text-sm text-muted-foreground">
                    {loadingList ? 'Loading…' : 'No joc.controller users found.'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>

              <Button variant="outline" onClick={() => router.push('/joc/mid/application')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
