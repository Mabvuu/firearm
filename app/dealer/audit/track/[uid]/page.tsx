// app/dealer/audit/track/[uid]/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import NavPage from '../../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

type Application = {
  application_uid: string
  applicant_name: string | null
  applicant_email: string | null
  officer_email: string | null
  gun_uid: number | null
  status: string | null
  created_at: string
  national_id: string | null
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

type LookupRes = { application_uid?: string; error?: string }
type TimelineRes = { application: Application | null; events: EventRow[]; error?: string }

export default function TrackingPage({ params }: { params: Promise<{ uid: string }> }) {
  // ✅ Next 15/React 19: params is a Promise
  const { uid } = React.use(params)

  const router = useRouter()
  const nationalId = (uid ?? '').trim()

  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<Application | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [error, setError] = useState<string | null>(null)

  // floater modal state
  const [openTracker, setOpenTracker] = useState(false)
  const [trackInput, setTrackInput] = useState('')
  const [trackError, setTrackError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const token = session?.access_token
        if (!token) {
          setError('Not logged in')
          setLoading(false)
          return
        }

        if (!nationalId) {
          setError('Missing National ID')
          setLoading(false)
          return
        }

        // 1) national id -> application_uid
        const lookup = await fetch(
          `/api/applications/by-national-id/${encodeURIComponent(nationalId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        const lookupCt = lookup.headers.get('content-type') || ''
        if (!lookupCt.includes('application/json')) {
          setError('Lookup route missing (404)')
          setLoading(false)
          return
        }

        const lookupData: LookupRes = await lookup.json()
        if (!lookup.ok || !lookupData.application_uid) {
          setError(lookupData.error ?? 'No application found for that National ID')
          setApplication(null)
          setEvents([])
          setLoading(false)
          return
        }

        const applicationUid = lookupData.application_uid

        // 2) timeline by uid (hidden)
        const res = await fetch(`/api/applications/${encodeURIComponent(applicationUid)}/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('application/json')) {
          setError('Timeline route missing (404)')
          setLoading(false)
          return
        }

        const data: TimelineRes = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Failed to load timeline')
          setApplication(null)
          setEvents([])
          setLoading(false)
          return
        }

        setApplication(data.application ?? null)
        setEvents(data.events ?? [])
        setLoading(false)
      } catch (e) {
        console.error(e)
        setError('Failed to load tracking')
        setApplication(null)
        setEvents([])
        setLoading(false)
      }
    }

    void load()
  }, [nationalId])

  const goTrack = () => {
    const cleaned = trackInput.trim()
    if (!cleaned) {
      setTrackError('Enter a National ID')
      return
    }

    setOpenTracker(false)
    setTrackInput('')
    setTrackError(null)

    router.push(`/dealer/audit/track/${encodeURIComponent(cleaned)}`)
  }

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
              <CardDescription>National ID: {nationalId}</CardDescription>
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
                events.map((ev) => (
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

      {/* FLOATING TRACK BUTTON */}
      <button
        type="button"
        onClick={() => {
          setOpenTracker(true)
          setTrackError(null)
          setTrackInput('')
        }}
        className="fixed bottom-6 right-6 z-50 rounded-full px-5 py-3 text-white shadow-lg"
        style={{ backgroundColor: '#2F4F6F' }}
      >
        Track
      </button>

      {/* FLOATING MODAL */}
      {openTracker && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenTracker(false)} />

          <div className="absolute bottom-20 right-6 w-[360px] max-w-[90vw] rounded-xl border border-black/10 bg-white shadow-xl">
            <div className="p-4 border-b border-black/10">
              <div className="text-base font-semibold text-[#1F2A35]">Track an application</div>
              <div className="text-xs text-muted-foreground">Enter the applicant National ID.</div>
            </div>

            <div className="p-4 space-y-3">
              <Input
                placeholder="e.g. 900"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') goTrack()
                  if (e.key === 'Escape') setOpenTracker(false)
                }}
              />

              {trackError ? <div className="text-xs text-red-600">{trackError}</div> : null}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpenTracker(false)}>
                  Cancel
                </Button>
                <Button
                  className="text-white"
                  style={{ backgroundColor: '#2F4F6F' }}
                  onClick={goTrack}
                >
                  Track
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
