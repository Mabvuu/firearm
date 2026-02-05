// app/dealer/audit/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import TrackFloater from '@/components/TrackFloater'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'

type ApplicationRow = {
  id: number
  application_uid: string
  applicant_name: string | null
  national_id: string | null
  status: string | null
  created_at: string
  officer_email: string | null
  gun_uid: number | null
}

type ResultRow = {
  application_id: number
  result: 'approved' | 'declined'
  wallet_id: string | null
  decided_at: string
}

type Row = ApplicationRow & { result: ResultRow | null }

const PAGE_SIZE = 50

export default function DealerAuditPage() {
  const router = useRouter()

  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [results, setResults] = useState<Record<number, ResultRow | null>>({})
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'approved' | 'declined' | 'open'>('all')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const email = session?.user?.email || null
      if (!email) {
        setApps([])
        setResults({})
        setLoading(false)
        return
      }

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const base = supabase
        .from('applications')
        .select('id, application_uid, applicant_name, national_id, status, created_at, officer_email, gun_uid')
        // ✅ show apps where dealer is owner either way
        .or(`applicant_email.eq.${email},created_by_email.eq.${email}`)
        .order('created_at', { ascending: false })
        .range(from, to)

      const q = query.trim()
      const appsRes = q
        ? await base.or(
            `application_uid.ilike.%${q}%,national_id.ilike.%${q}%,applicant_name.ilike.%${q}%`
          )
        : await base

      if (appsRes.error) {
        console.error(appsRes.error)
        setApps([])
        setResults({})
        setLoading(false)
        return
      }

      const rows = (appsRes.data ?? []) as ApplicationRow[]
      setApps(rows)

      if (!rows.length) {
        setResults({})
        setLoading(false)
        return
      }

      const ids = rows.map(r => r.id)

      const res = await supabase
        .from('application_results')
        .select('application_id, result, wallet_id, decided_at')
        .in('application_id', ids)

      if (res.error) {
        console.error(res.error)
        setResults({})
        setLoading(false)
        return
      }

      const map: Record<number, ResultRow> = {}
      ;(res.data ?? []).forEach((r: ResultRow) => {
        map[r.application_id] = r
      })

      const filled: Record<number, ResultRow | null> = {}
      ids.forEach(id => {
        filled[id] = map[id] ?? null
      })
      setResults(filled)

      setLoading(false)
    }

    void load()
  }, [page, query])

  const rows: Row[] = useMemo(() => {
    const list: Row[] = apps.map(a => ({ ...a, result: results[a.id] ?? null }))
    return list.filter(r => {
      if (filter === 'approved') return r.result?.result === 'approved'
      if (filter === 'declined') return r.result?.result === 'declined'
      if (filter === 'open') return r.result === null
      return true
    })
  }, [apps, results, filter])

  const viewWallet = (walletId: string) => {
    router.push(`/joc/controller/wallet?walletId=${encodeURIComponent(walletId)}`)
  }

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4 border-r border-black/10">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="max-w-6xl space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Applications Register</h1>
              <p className="text-sm text-muted-foreground">
                Final decisions show as Approved / Denied. Built for high volume.
              </p>
            </div>

            <Button asChild>
              <Link href="/dealer/application">New Application</Link>
            </Button>
          </div>

          <Separator />

          <Card>
            <CardHeader className="space-y-4">
              <CardTitle>Document System</CardTitle>
              <CardDescription>Search, filter, paginate. No tracking clutter.</CardDescription>

              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="Search UID, National ID, Name…"
                  value={query}
                  onChange={e => {
                    setPage(0)
                    setQuery(e.target.value)
                  }}
                  className="max-w-sm"
                />

                <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
                  All
                </Button>

                <Button variant={filter === 'open' ? 'default' : 'outline'} onClick={() => setFilter('open')}>
                  Open
                </Button>

                <Button
                  variant={filter === 'approved' ? 'default' : 'outline'}
                  onClick={() => setFilter('approved')}
                >
                  Approved
                </Button>

                <Button
                  variant={filter === 'declined' ? 'default' : 'outline'}
                  onClick={() => setFilter('declined')}
                >
                  Denied
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-muted-foreground">No records found.</div>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-left">Application UID</th>
                        <th className="p-3 text-left">Applicant</th>
                        <th className="p-3 text-left">National ID</th>
                        <th className="p-3 text-left">Gun</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Created</th>
                        <th className="p-3 text-left">Decision Date</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map(r => {
                        const walletId = (r.result?.wallet_id ?? '').trim()
                        const isApproved = r.result?.result === 'approved'
                        const isDeclined = r.result?.result === 'declined'
                        const decidedAt = r.result?.decided_at ?? null

                        return (
                          <tr key={r.application_uid} className="border-t">
                            <td className="p-3 font-mono text-xs">{r.application_uid}</td>
                            <td className="p-3">{r.applicant_name ?? '-'}</td>
                            <td className="p-3">{r.national_id ?? '-'}</td>
                            <td className="p-3">{r.gun_uid ?? '-'}</td>

                            <td className="p-3">
                              {isApproved ? (
                                <Badge className="bg-green-600 text-white">Approved</Badge>
                              ) : isDeclined ? (
                                <Badge className="bg-red-600 text-white">Denied</Badge>
                              ) : (
                                <Badge variant="outline">{(r.status ?? 'in progress').toLowerCase()}</Badge>
                              )}
                            </td>

                            <td className="p-3 text-muted-foreground">
                              {new Date(r.created_at).toLocaleString()}
                            </td>

                            <td className="p-3 text-muted-foreground">
                              {decidedAt ? new Date(decidedAt).toLocaleString() : '-'}
                            </td>

                            <td className="p-3 text-right">
                              {isApproved && walletId ? (
                                <Button onClick={() => viewWallet(walletId)}>View wallet</Button>
                              ) : (
                                <Button variant="outline" disabled>
                                  No action
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Page {page + 1}</span>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={page === 0 || loading}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>

                  <Button
                    variant="outline"
                    disabled={loading || apps.length < PAGE_SIZE}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TrackFloater trackRouteBase="/dealer/audit/track" />
    </div>
  )
}
