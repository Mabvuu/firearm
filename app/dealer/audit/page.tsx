'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type ApplicationRow = {
  application_uid: string
  applicant_name: string | null
  national_id: string | null
  status: string | null
  created_at: string
  officer_email: string | null
  gun_uid: number | null
}

export default function DealerAuditPage() {
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const email = user?.email
      if (!email) {
        setApps([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select(
          'application_uid, applicant_name, national_id, status, created_at, officer_email, gun_uid'
        )
        .eq('applicant_email', email)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setApps([])
        setLoading(false)
        return
      }

      setApps((data ?? []) as ApplicationRow[])
      setLoading(false)
    }

    void load()
  }, [])

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4 border-r border-black/10">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="max-w-5xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1F2A35]">Dealer Audit</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your submitted applications and their current status.
              </p>
            </div>

            <Button asChild className="text-white" style={{ backgroundColor: '#2F4F6F' }}>
              <Link href="/dealer/application">New Application</Link>
            </Button>
          </div>

          <Separator />

          <Card className="border-black/10 bg-white">
            <CardHeader>
              <CardTitle className="text-[#1F2A35]">Applications</CardTitle>
              <CardDescription>Open Tracking to see the full timeline.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : apps.length === 0 ? (
                <div className="text-sm text-muted-foreground">No applications yet.</div>
              ) : (
                apps.map(a => (
                  <div
                    key={a.application_uid}
                    className="flex flex-col gap-2 rounded-md border border-black/10 bg-[#F7F6F2] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-[#1F2A35]">
                        {a.applicant_name ?? 'Unknown applicant'}{' '}
                        <span className="text-muted-foreground font-normal">
                          (UID: {a.application_uid})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Officer: {a.officer_email ?? '-'} • Gun: {a.gun_uid ?? '-'} • NatID:{' '}
                        {a.national_id ?? '-'}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className="border bg-white text-[#1F2A35]">
                        {a.status ?? 'unknown'}
                      </Badge>

                      <Button asChild variant="outline">
                        <Link href={`/dealer/application/tracking/${a.application_uid}`}>
                          Tracking
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
