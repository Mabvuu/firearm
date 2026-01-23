// app/police/firearmofficer/dashboard/page.tsx
'use client'

import Link from 'next/link'
import NavPage from '../nav/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

export default function FirearmOfficerDashboard() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.snowWhite }}>
      {/* Left nav */}
      <div className="w-1/4 min-w-[260px] border-r" style={{ borderColor: COLORS.naturalAluminum }}>
        <NavPage />
      </div>

      {/* Right content */}
      <main className="w-3/4 p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
              Dashboard
            </h1>
            <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
              Quick actions and latest activity.
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/police/firearmofficer/application">
              <Button
                className="h-11 px-4 text-base"
                style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
              >
                View Applications
              </Button>
            </Link>

            <Link href="/police/firearmofficer/applicants">
              <Button
                variant="outline"
                className="h-11 px-4 text-base"
                style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
              >
                Applicants
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card style={{ borderColor: COLORS.naturalAluminum }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: COLORS.lamar }}>
                Pending Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
                —
              </div>
              <div className="mt-1 text-xs" style={{ color: COLORS.coolGreyMedium }}>
                Waiting for review
              </div>
            </CardContent>
          </Card>

          <Card style={{ borderColor: COLORS.naturalAluminum }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: COLORS.lamar }}>
                Competency Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
                —
              </div>
              <div className="mt-1 text-xs" style={{ color: COLORS.coolGreyMedium }}>
                Due / in progress
              </div>
            </CardContent>
          </Card>

          <Card style={{ borderColor: COLORS.naturalAluminum }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: COLORS.lamar }}>
                Applicants Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
                —
              </div>
              <div className="mt-1 text-xs" style={{ color: COLORS.coolGreyMedium }}>
                New submissions
              </div>
            </CardContent>
          </Card>

          <Card style={{ borderColor: COLORS.naturalAluminum }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ color: COLORS.lamar }}>
                Audit Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
                —
              </div>
              <div className="mt-1 text-xs" style={{ color: COLORS.coolGreyMedium }}>
                Needs attention
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two panels */}
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Recent Applications */}
          <Card style={{ borderColor: COLORS.naturalAluminum }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base" style={{ color: COLORS.blackBlue }}>
                Recent Applications
              </CardTitle>
              <Link href="/police/firearmofficer/application">
                <Button
                  variant="outline"
                  className="h-9"
                  style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                >
                  Open
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="space-y-3">
              <div
                className="rounded-md border p-3"
                style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                      No data yet
                    </div>
                    <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
                      Hook this up to Supabase and show latest 5 applications here.
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2 py-1 text-xs"
                    style={{ backgroundColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                  >
                    Pending
                  </span>
                </div>
              </div>

              <div
                className="rounded-md border p-3"
                style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                      Tip
                    </div>
                    <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
                      Show: applicant name • province • status • created date.
                    </div>
                  </div>
                  <span
                    className="rounded-full px-2 py-1 text-xs"
                    style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                  >
                    UI
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card style={{ borderColor: COLORS.naturalAluminum }}>
            <CardHeader>
              <CardTitle className="text-base" style={{ color: COLORS.blackBlue }}>
                Quick Actions
              </CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Link href="/police/firearmofficer/application">
                <Button
                  className="w-full h-12 text-base justify-start"
                  style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                >
                  Review Applications
                </Button>
              </Link>

              <Link href="/police/firearmofficer/competency">
                <Button
                  className="w-full h-12 text-base justify-start"
                  style={{ backgroundColor: COLORS.lamar, color: COLORS.snowWhite }}
                >
                  Competency Checks
                </Button>
              </Link>

              <Link href="/police/firearmofficer/applicants">
                <Button
                  variant="outline"
                  className="w-full h-12 text-base justify-start"
                  style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
                >
                  View Applicants
                </Button>
              </Link>

              <Link href="/police/firearmofficer/audit">
                <Button
                  variant="outline"
                  className="w-full h-12 text-base justify-start"
                  style={{ borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                >
                  Audit Log
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Footer strip */}
        <div className="mt-6 rounded-md border p-4" style={{ borderColor: COLORS.naturalAluminum }}>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                System Status
              </div>
              <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
                All services running (placeholder).
              </div>
            </div>
            <span
              className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs"
              style={{ backgroundColor: 'rgba(62,92,128,0.12)', color: COLORS.lamar }}
            >
              OK
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
