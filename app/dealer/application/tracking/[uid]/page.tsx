'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import NavPage from '../../../nav/page'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type Application = {
  application_uid: string
  applicant_name: string | null
  applicant_email: string | null
  officer_email: string | null
  gun_uid: number | null
  status: string | null
  created_at: string
}

type EventRow = {
  id: number
  application_uid: string
  from_status: string | null
  to_status: string
  action: string
  actor_email: string | null
  actor_role: string | null
  note: string | null
  created_at: string
}

export default function TrackingPage({ params }: { params: { uid: string } }) {
  const uid = params.uid

  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<Application | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/applications/${uid}/timeline`)
      const data = await res.json()

      if (!res.ok) {
        setError(data?.error ?? 'Failed to load timeline')
        setApplication(null)
        setEvents([])
        setLoading(false)
        return
      }

      setApplication(data.application ?? null)
      setEvents(data.events ?? [])
      setLoading(false)
    }

    void load()
  }, [uid])

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4 border-r border-black/10">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="max-w-5xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1F2A35]">Application Tracking</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Full history of where the application has been.
              </p>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/dealer/audit">Back to Audit</Link>
              </Button>
              <Button asChild className="text-white" style={{ backgroundColor: '#2F4F6F' }}>
                <Link href="/dealer/application">New Application</Link>
              </Button>
            </div>
          </div>

          <Separator />

          {error ? (
            <Card className="border-black/10 bg-white">
              <CardHeader>
                <CardTitle className="text-[#1F2A35]">Error</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <Card className="border-black/10 bg-white">
            <CardHeader>
              <CardTitle className="text-[#1F2A35]">Summary</CardTitle>
              <CardDescription>UID: {uid}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : application ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-[#1F2A35]">
                    Applicant: <b>{application.applicant_name ?? '-'}</b> • Officer:{' '}
                    <b>{application.officer_email ?? '-'}</b> • Gun: <b>{application.gun_uid ?? '-'}</b>
                  </div>

                  <Badge className="border bg-white text-[#1F2A35]">
                    {application.status ?? 'unknown'}
                  </Badge>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Application not found.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-black/10 bg-white">
            <CardHeader>
              <CardTitle className="text-[#1F2A35]">Timeline</CardTitle>
              <CardDescription>Every move is recorded.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : events.length === 0 ? (
                <div className="text-sm text-muted-foreground">No tracking events yet.</div>
              ) : (
                events.map(ev => (
                  <div
                    key={ev.id}
                    className="rounded-md border border-black/10 bg-[#F7F6F2] p-4 space-y-1"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-medium text-[#1F2A35]">
                        {ev.action}{' '}
                        <span className="text-muted-foreground font-normal">
                          ({ev.from_status ?? '—'} → {ev.to_status})
                        </span>
                      </div>

                      <Badge className="border bg-white text-[#1F2A35]">
                        {new Date(ev.created_at).toLocaleString()}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Actor: {ev.actor_email ?? '-'} {ev.actor_role ? `(${ev.actor_role})` : ''}
                    </div>

                    {ev.note ? <div className="text-sm text-[#1F2A35]">{ev.note}</div> : null}
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
