// app/police/oic/application/approval/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
}

type CFRPick = {
  email: string
  national_id: string
  auth_uid: string
}

export default function OICApprovalPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [cfrs, setCfrs] = useState<CFRPick[]>([])
  const [query, setQuery] = useState('')
  const [loadingCfr, setLoadingCfr] = useState(false)
  const [sendingTo, setSendingTo] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) return

    const loadApp = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, status')
        .eq('id', appId)
        .single()

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setApp(data as Application)
    }

    loadApp()
  }, [appId])

  useEffect(() => {
    const loadCFRs = async () => {
      setLoadingCfr(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('email, national_id, auth_uid')
        .eq('role', 'cfr.cfr')
        .order('created_at', { ascending: false })

      setLoadingCfr(false)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setCfrs((data as CFRPick[]) ?? [])
    }

    loadCFRs()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cfrs
    return cfrs.filter(c =>
      `${c.email} ${c.national_id} ${c.auth_uid}`.toLowerCase().includes(q)
    )
  }, [cfrs, query])

  const sendToCFR = async (pick: CFRPick) => {
    if (!app) return
    setErrorMsg(null)
    setSendingTo(pick.email)

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
        status: 'sent_to_cfr',
        cfr_email: pick.email,
        oic_approved_by_email: user.email,
        oic_approved_by_uid: user.id,
      })
      .eq('id', app.id)

    setSendingTo(null)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push('/police/oic/application')
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
      <div className="w-1/4 min-w-[260px]" style={{ borderRight: `1px solid ${COLORS.naturalAluminum}` }}>
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        {/* compact header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
              Choose CFR
            </h1>
            <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
              {app ? `${app.applicant_name} (#${app.id})` : '—'}
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
              onClick={() => router.push('/police/oic/application')}
            >
              Cancel
            </Button>
          </div>
        </div>

        <Card style={{ borderColor: COLORS.naturalAluminum }}>
          <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
            <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
              Send application to CFR
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {errorMsg && (
              <div
                className="rounded-md border p-3 text-sm"
                style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#b91c1c', backgroundColor: 'rgba(239,68,68,0.06)' }}
              >
                {errorMsg}
              </div>
            )}

            <Input
              className="h-10"
              placeholder="Search CFR (email / national id / uid)"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />

            {/* file-like list */}
            <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
              <div className="max-h-80 overflow-y-auto">
                {loadingCfr ? (
                  <div className="p-3 text-sm" style={{ color: COLORS.coolGreyMedium }}>
                    Loading CFR users…
                  </div>
                ) : filtered.length ? (
                  <ul className="divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
                    {filtered.map((c, idx) => (
                      <li key={c.email}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted transition flex items-center justify-between gap-3"
                          onClick={() => sendToCFR(c)}
                          disabled={!!sendingTo}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: COLORS.blackBlue }}>
                              {idx + 1}. {c.email}
                            </div>
                            <div className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                              National ID: {c.national_id} • UID: {c.auth_uid}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="h-9"
                            disabled={!!sendingTo}
                            style={{
                              backgroundColor: COLORS.blackBlue,
                              color: COLORS.snowWhite,
                            }}
                          >
                            {sendingTo === c.email ? 'Sending…' : 'Send'}
                          </Button>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3 text-sm" style={{ color: COLORS.coolGreyMedium }}>
                    No CFR users found.
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
