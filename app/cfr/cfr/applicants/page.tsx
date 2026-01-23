// app/cfr/cfr/applicants/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

type RawApplication = {
  id: number
  applicant_email: string
  applicant_name: string | null
  national_id: string | null
  phone: string | null
  province: string | null
  district: string | null
  status: string
  created_at: string
}

type ApplicantRow = {
  applicant_email: string
  applicant_name: string | null
  national_id: string | null
  phone: string | null
  province: string | null
  district: string | null

  total: number
  in_cfr: number
  approved_cfr: number
  declined_cfr: number
  returned_cfr: number

  last_status: string
  last_application_id: number
  last_created_at: string
}

type AppLite = { id: number; status: string; created_at: string }

const isCfrApproved = (s: string) => s === 'approved_by_cfr' || s === 'approved_cfr'
const isCfrDeclined = (s: string) => s === 'declined_by_cfr' || s === 'declined_cfr' || s === 'declined'
const isCfrReturned = (s: string) => s === 'returned_by_cfr' || s === 'returned_cfr' || s === 'returned'
const isInCfr = (s: string) =>
  s === 'sent_to_cfr' || s === 'in_cfr' || s === 'received_by_cfr' || s === 'pending_cfr'

const tone = (s: string) => {
  if (isCfrApproved(s)) return 'bg-green-500'
  if (isCfrDeclined(s) || isCfrReturned(s)) return 'bg-red-500'
  if (isInCfr(s)) return 'bg-blue-500'
  return 'bg-gray-400'
}

export default function CFRApplicantsPage() {
  const [rows, setRows] = useState<ApplicantRow[]>([])
  const [appsByEmail, setAppsByEmail] = useState<Record<string, AppLite[]>>({})
  const [openEmail, setOpenEmail] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'in_cfr' | 'approved' | 'declined' | 'returned'>('all')

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        setLoading(false)
        return
      }

      // ✅ CFR scope: apps assigned to THIS CFR user
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_email, applicant_name, national_id, phone, province, district, status, created_at')
        .eq('cfr_email', user.email)
        .order('created_at', { ascending: false })

      if (error) {
        alert(error.message)
        setLoading(false)
        return
      }

      const list: RawApplication[] = (data as RawApplication[] | null) ?? []

      const grouped: Record<string, RawApplication[]> = {}
      for (const a of list) {
        if (!grouped[a.applicant_email]) grouped[a.applicant_email] = []
        grouped[a.applicant_email].push(a)
      }

      const summary: ApplicantRow[] = Object.entries(grouped).map(([email, apps]) => {
        const last = apps[0]

        const in_cfr = apps.filter(a => isInCfr(a.status)).length
        const approved_cfr = apps.filter(a => isCfrApproved(a.status)).length
        const declined_cfr = apps.filter(a => isCfrDeclined(a.status)).length
        const returned_cfr = apps.filter(a => isCfrReturned(a.status)).length

        return {
          applicant_email: email,
          applicant_name: last.applicant_name,
          national_id: last.national_id,
          phone: last.phone,
          province: last.province,
          district: last.district,

          total: apps.length,
          in_cfr,
          approved_cfr,
          declined_cfr,
          returned_cfr,

          last_status: last.status,
          last_application_id: last.id,
          last_created_at: last.created_at,
        }
      })

      const byEmail: Record<string, AppLite[]> = {}
      for (const [email, apps] of Object.entries(grouped)) {
        byEmail[email] = apps.map(a => ({ id: a.id, status: a.status, created_at: a.created_at }))
      }

      setRows(summary)
      setAppsByEmail(byEmail)
      setLoading(false)
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    let list = rows

    if (filter === 'in_cfr') list = list.filter(r => r.in_cfr > 0)
    if (filter === 'approved') list = list.filter(r => r.approved_cfr > 0)
    if (filter === 'declined') list = list.filter(r => r.declined_cfr > 0)
    if (filter === 'returned') list = list.filter(r => r.returned_cfr > 0)

    const q = query.trim().toLowerCase()
    if (!q) return list

    return list.filter(r =>
      `${r.applicant_email} ${r.applicant_name ?? ''} ${r.national_id ?? ''} ${r.phone ?? ''} ${r.province ?? ''} ${r.district ?? ''} ${r.last_status}`
        .toLowerCase()
        .includes(q)
    )
  }, [rows, query, filter])

  if (loading) {
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
              Applicants
            </h1>
            <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
              Applicants handled by CFR ({filtered.length})
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <div className="w-[320px] max-w-full">
              <Input
                className="h-10"
                placeholder="Search name / email / id / province"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            <div className="flex rounded-md overflow-hidden border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="px-3 h-10 text-sm"
                style={{
                  backgroundColor: filter === 'all' ? COLORS.blackBlue : 'transparent',
                  color: filter === 'all' ? COLORS.snowWhite : COLORS.blackBlue,
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter('in_cfr')}
                className="px-3 h-10 text-sm"
                style={{
                  backgroundColor: filter === 'in_cfr' ? COLORS.blackBlue : 'transparent',
                  color: filter === 'in_cfr' ? COLORS.snowWhite : COLORS.blackBlue,
                }}
              >
                In CFR
              </button>
              <button
                type="button"
                onClick={() => setFilter('approved')}
                className="px-3 h-10 text-sm"
                style={{
                  backgroundColor: filter === 'approved' ? COLORS.blackBlue : 'transparent',
                  color: filter === 'approved' ? COLORS.snowWhite : COLORS.blackBlue,
                }}
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => setFilter('declined')}
                className="px-3 h-10 text-sm"
                style={{
                  backgroundColor: filter === 'declined' ? COLORS.blackBlue : 'transparent',
                  color: filter === 'declined' ? COLORS.snowWhite : COLORS.blackBlue,
                }}
              >
                Declined
              </button>
              <button
                type="button"
                onClick={() => setFilter('returned')}
                className="px-3 h-10 text-sm"
                style={{
                  backgroundColor: filter === 'returned' ? COLORS.blackBlue : 'transparent',
                  color: filter === 'returned' ? COLORS.snowWhite : COLORS.blackBlue,
                }}
              >
                Returned
              </button>
            </div>
          </div>
        </div>

        <Card style={{ borderColor: COLORS.naturalAluminum }}>
          <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
            <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
              Applicant list
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4">
            {filtered.length === 0 ? (
              <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                No applicants yet.
              </div>
            ) : (
              <div className="rounded-md border bg-white overflow-hidden" style={{ borderColor: COLORS.naturalAluminum }}>
                <div
                  className="px-3 py-2 text-xs font-semibold border-b grid grid-cols-12 gap-2"
                  style={{ borderColor: COLORS.naturalAluminum, color: COLORS.coolGreyMedium }}
                >
                  <div className="col-span-4">Applicant</div>
                  <div className="col-span-3">National ID</div>
                  <div className="col-span-2">Last status</div>
                  <div className="col-span-2">Approved / Declined</div>
                  <div className="col-span-1 text-right">Open</div>
                </div>

                <ul className="divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
                  {filtered.map((r, idx) => {
                    const isOpen = openEmail === r.applicant_email
                    return (
                      <li key={r.applicant_email}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted transition"
                          onClick={() => setOpenEmail(isOpen ? null : r.applicant_email)}
                        >
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4 min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: COLORS.blackBlue }}>
                                {idx + 1}. {r.applicant_name || '—'}
                              </div>
                              <div className="text-[11px] truncate" style={{ color: COLORS.coolGreyMedium }}>
                                {r.applicant_email}
                              </div>
                            </div>

                            <div className="col-span-3 text-sm truncate" style={{ color: COLORS.blackBlue }}>
                              {r.national_id || '—'}
                            </div>

                            <div className="col-span-2 flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${tone(r.last_status)}`} />
                              <span className="text-sm" style={{ color: COLORS.blackBlue }}>
                                {r.last_status}
                              </span>
                            </div>

                            <div className="col-span-2 text-sm" style={{ color: COLORS.blackBlue }}>
                              {r.approved_cfr} / {r.declined_cfr}
                            </div>

                            <div className="col-span-1 text-right text-xs" style={{ color: COLORS.lamar }}>
                              {isOpen ? 'Close' : 'View'}
                            </div>
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-3 pb-3">
                            <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
                              <div
                                className="px-3 py-2 text-xs font-semibold border-b"
                                style={{ borderColor: COLORS.naturalAluminum, color: COLORS.coolGreyMedium }}
                              >
                                Applications (CFR inbox)
                              </div>

                              <ul className="divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
                                {(appsByEmail[r.applicant_email] ?? []).map((a, i) => (
                                  <li key={a.id} className="px-3 py-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-sm truncate" style={{ color: COLORS.blackBlue }}>
                                        {i + 1}. Application #{a.id}
                                      </div>
                                      <div className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                                        {new Date(a.created_at).toLocaleString()}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className={`h-2.5 w-2.5 rounded-full ${tone(a.status)}`} />
                                      <span className="text-sm" style={{ color: COLORS.blackBlue }}>
                                        {a.status}
                                      </span>

                                      <Link
                                        href="/cfr/cfr/application"
                                        className="text-xs underline ml-3"
                                        style={{ color: COLORS.lamar }}
                                      >
                                        Open inbox
                                      </Link>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
