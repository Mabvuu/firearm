// app/cfr/dispol/application/approval/page.tsx
'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

type Application = {
  id: number
  applicant_name: string
  status: string
  propol_email: string | null
}

type Pick = {
  email: string
  national_id: string
  auth_uid: string
}

function DispolApprovalPickPropolPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [people, setPeople] = useState<Pick[]>([])
  const [query, setQuery] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) return

    const load = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, status, propol_email')
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
        .eq('role', 'cfr.propol')
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

  const approveAndSend = async (pick: Pick) => {
    if (!app) return
    setSendingEmail(pick.email)
    setErrorMsg(null)

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user?.email || !user.id) {
      setSendingEmail(null)
      setErrorMsg('Not logged in')
      return
    }

    const { error } = await supabase
      .from('applications')
      .update({
        status: 'sent_to_propol',
        propol_email: pick.email,
        dispol_forwarded_by_email: user.email,
        dispol_forwarded_by_uid: user.id,
      })
      .eq('id', app.id)

    setSendingEmail(null)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push('/cfr/dispol/application')
  }

  if (!appId) {
    return (
      <div className="p-8" style={{ backgroundColor: COLORS.snowWhite, color: COLORS.blackBlue }}>
        Missing appId in URL.
      </div>
    )
  }

  if (!app && !errorMsg) {
    return (
      <div className="p-8" style={{ backgroundColor: COLORS.snowWhite, color: COLORS.blackBlue }}>
        Loading…
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.snowWhite }}>
      <div
        className="w-1/4 min-w-[260px]"
        style={{ borderRight: `1px solid ${COLORS.naturalAluminum}` }}
      >
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
              Approval
            </h1>
            <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
              Choose Province Police (cfr.propol)
              {app ? ` — ${app.applicant_name} (#${app.id})` : ''}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10"
              style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
              onClick={() => router.back()}
            >
              Back
            </Button>
            <Button
              variant="outline"
              className="h-10"
              style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
              onClick={() => router.push('/cfr/dispol/application')}
            >
              Cancel
            </Button>
          </div>
        </div>

        <Card style={{ borderColor: COLORS.naturalAluminum }}>
          <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
            <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
              Province Police List
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {errorMsg && (
              <div
                className="rounded-md border p-3 text-sm"
                style={{
                  borderColor: 'rgba(239,68,68,0.4)',
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  color: '#991b1b',
                }}
              >
                {errorMsg}
              </div>
            )}

            <Input
              placeholder="Search (email / national id)"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />

            <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
              <div className="px-3 py-2 border-b" style={{ borderColor: COLORS.naturalAluminum }}>
                <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                  Results ({filtered.length})
                </div>
                <div className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                  Click “Approve & Send” to forward the application.
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
                {filtered.map(p => (
                  <div key={p.email} className="px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: COLORS.blackBlue }}>
                        {p.email}
                      </div>
                      <div className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                        National ID: {p.national_id} • UID: {p.auth_uid}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      disabled={!!sendingEmail}
                      onClick={() => approveAndSend(p)}
                      style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                    >
                      {sendingEmail === p.email ? 'Sending…' : 'Approve & Send'}
                    </Button>
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div className="px-3 py-3 text-sm" style={{ color: COLORS.coolGreyMedium }}>
                    {loadingList ? 'Loading…' : 'No cfr.propol users found.'}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DispolApprovalPickPropolPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <DispolApprovalPickPropolPageInner />
    </Suspense>
  )
}
