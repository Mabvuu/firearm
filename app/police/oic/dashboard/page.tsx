// app/police/oic/dashboard/page.tsx
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

type Application = {
  id: number
  applicant_name: string | null
  status: string
  created_at: string
}

export default function PoliceOICDashboard() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('applications')
        .select('id, applicant_name, status, created_at')
        .eq('oic_email', user.email)
        .order('created_at', { ascending: false })

      setApps((data as Application[]) ?? [])
      setLoading(false)
    }

    load()
  }, [])

  const counts = useMemo(() => {
    const assigned = apps.length
    const pending = apps.filter(a =>
      ['unread', 'forwarded', 'returned'].includes(a.status)
    ).length
    const approved = apps.filter(a =>
      ['approved_by_oic', 'sent_to_cfr'].includes(a.status)
    ).length
    const declined = apps.filter(a => a.status === 'declined').length

    return { assigned, pending, approved, declined }
  }, [apps])

  const recent = apps.slice(0, 5)

  if (loading) return <div className="p-8">Loading…</div>

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.snowWhite }}>
      {/* NAV */}
      <div
        className="w-1/4 min-w-[260px]"
        style={{ borderRight: `1px solid ${COLORS.naturalAluminum}` }}
      >
        <NavPage />
      </div>

      {/* CONTENT */}
      <main className="w-3/4 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
            Officer in Charge
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.lamar }}>
            Dashboard
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Assigned Applications" value={counts.assigned} />
          <StatCard title="Pending Review" value={counts.pending} />
          <StatCard
            title="Approved / Declined"
            value={`${counts.approved} / ${counts.declined}`}
          />
        </div>

        {/* ACTIONS + RECENT */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <div
              className="rounded-lg border bg-white p-4"
              style={{ borderColor: COLORS.naturalAluminum }}
            >
              <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                Quick Actions
              </div>

              <div className="mt-3 space-y-2">
                <a
                  href="/police/oic/application"
                  className="block rounded-md px-3 py-2 text-sm border"
                  style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                >
                  View Applications
                </a>

                <a
                  href="/police/oic/records"
                  className="block rounded-md px-3 py-2 text-sm border"
                  style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                >
                  View Records
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div
              className="rounded-lg border bg-white"
              style={{ borderColor: COLORS.naturalAluminum }}
            >
              <div
                className="px-4 py-3 border-b text-sm font-semibold"
                style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
              >
                Recent Applications
              </div>

              <div className="p-4 divide-y">
                {recent.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No recent activity.
                  </div>
                ) : (
                  recent.map(a => (
                    <div key={a.id} className="py-2 flex justify-between items-center">
                      <div className="min-w-0">
                        <div className="text-sm" style={{ color: COLORS.blackBlue }}>
                          Application #{a.id}
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: COLORS.coolGreyMedium }}
                        >
                          {a.applicant_name || '—'} • {a.status}
                        </div>
                      </div>

                      <a
                        href="/police/oic/application"
                        className="text-[11px]"
                        style={{ color: COLORS.lamar }}
                      >
                        View
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div
      className="rounded-lg border bg-white p-4"
      style={{ borderColor: COLORS.naturalAluminum }}
    >
      <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
        {title}
      </div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: COLORS.blackBlue }}>
        {value}
      </div>
    </div>
  )
}
