// app/cfr/dispol/dashboard/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

type ApplicationRow = {
  id: number
  applicant_name: string | null
  applicant_email: string
  status: string
  created_at: string | null
}

export default function DispolDashboard() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [assignedTotal, setAssignedTotal] = useState(0)
  const [needsReview, setNeedsReview] = useState(0)
  const [approvedCount, setApprovedCount] = useState(0)
  const [declinedCount, setDeclinedCount] = useState(0)

  const [recent, setRecent] = useState<ApplicationRow[]>([])

  useEffect(() => {
    const load = async () => {
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
        .select('id, applicant_name, applicant_email, status, created_at')
        .eq('dispol_email', user.email)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) {
        setLoading(false)
        setErrorMsg(error.message)
        return
      }

      const rows = (data as ApplicationRow[]) ?? []
      setRecent(rows.slice(0, 8))

      const total = rows.length
      const need = rows.filter(r => r.status === 'sent_to_dispol').length
      const appr = rows.filter(r => r.status === 'approved_by_dispol').length
      const decl = rows.filter(r => r.status === 'dispol_declined').length

      setAssignedTotal(total)
      setNeedsReview(need)
      setApprovedCount(appr)
      setDeclinedCount(decl)

      setLoading(false)
    }

    load()
  }, [])

  const resolvedLabel = useMemo(() => `${approvedCount} / ${declinedCount}`, [approvedCount, declinedCount])

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.snowWhite }}>
      <div
        className="w-1/4 min-w-[260px]"
        style={{ borderRight: `1px solid ${COLORS.naturalAluminum}` }}
      >
        <NavPage />
      </div>

      <main className="w-3/4 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
            District Police
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.lamar }}>
            CFR Inbox & Records Overview
          </p>
        </div>

        {errorMsg && (
          <div
            className="mb-4 rounded-md border p-3 text-sm"
            style={{
              borderColor: 'rgba(239,68,68,0.4)',
              backgroundColor: 'rgba(239,68,68,0.08)',
              color: '#991b1b',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Assigned (Total)" value={loading ? '—' : String(assignedTotal)} />
          <StatCard title="Needs Review" value={loading ? '—' : String(needsReview)} hint="status = sent_to_dispol" />
          <StatCard title="Approved" value={loading ? '—' : String(approvedCount)} hint="status = approved_by_dispol" />
          <StatCard title="Declined" value={loading ? '—' : String(declinedCount)} hint="status = dispol_declined" />
        </div>

        {/* Quick + recent */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border bg-white p-4" style={{ borderColor: COLORS.naturalAluminum }}>
              <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                Quick Actions
              </div>

              <div className="mt-3 space-y-2">
                <a
                  href="/cfr/dispol/application"
                  className="block rounded-md px-3 py-2 text-sm border"
                  style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                >
                  Open Inbox
                  <span className="ml-2 text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                    ({loading ? '—' : needsReview})
                  </span>
                </a>

                <a
                  href="/cfr/dispol/applicants"
                  className="block rounded-md px-3 py-2 text-sm border"
                  style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                >
                  Applicants / Records
                  <span className="ml-2 text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                    ({loading ? '—' : resolvedLabel})
                  </span>
                </a>

                <a
                  href="/cfr/dispol/audit"
                  className="block rounded-md px-3 py-2 text-sm border"
                  style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                >
                  Audit
                </a>
              </div>
            </div>
          </div>

          {/* Recent */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
              <div
                className="px-4 py-3 border-b text-sm font-semibold"
                style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
              >
                Recent Applications
              </div>

              <div className="divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="h-4 w-40 rounded" style={{ backgroundColor: COLORS.naturalAluminum }} />
                      <div className="mt-2 h-3 w-64 rounded" style={{ backgroundColor: 'rgba(217,216,214,0.65)' }} />
                    </div>
                  ))
                ) : recent.length ? (
                  recent.map(r => (
                    <a
                      key={r.id}
                      href="/cfr/dispol/application"
                      className="block px-4 py-3 hover:bg-black/5 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: COLORS.blackBlue }}>
                            #{r.id} — {r.applicant_name || 'Applicant'}
                          </div>
                          <div className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                            Dealer: {r.applicant_email} • Status: {r.status}
                          </div>
                        </div>
                        <span className="text-[11px]" style={{ color: COLORS.lamar }}>
                          View
                        </span>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="px-4 py-4 text-sm" style={{ color: COLORS.coolGreyMedium }}>
                    No assigned applications yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border bg-white p-4" style={{ borderColor: COLORS.naturalAluminum }}>
      <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
        {title}
      </div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: COLORS.blackBlue }}>
        {value}
      </div>
      <div className="mt-1 text-[11px]" style={{ color: COLORS.lamar }}>
        {hint ?? '—'}
      </div>
    </div>
  )
}
