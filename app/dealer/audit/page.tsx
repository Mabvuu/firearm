'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
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
  applicant_email: string | null
}

type ResultRow = {
  application_id: number
  result: 'approved' | 'declined'
  wallet_id: string | null
  decided_at: string
}

type Row = ApplicationRow & { resultRow: ResultRow | null }

const PAGE_SIZE = 50

const badgeFor = (status: string | null, result: ResultRow | null) => {
  if (result?.result === 'approved') return <Badge className="bg-green-600 text-white">Approved</Badge>
  if (result?.result === 'declined') return <Badge className="bg-red-600 text-white">Denied</Badge>

  const s = (status ?? 'unknown').toLowerCase()
  return <Badge variant="outline">{s}</Badge>
}

export default function DealerAuditPage() {
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [resultsByAppId, setResultsByAppId] = useState<Record<number, ResultRow | null>>({})
  const [loading, setLoading] = useState(true)

  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'approved' | 'declined' | 'open'>('all')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const email = user?.email
      if (!email) {
        setApps([])
        setResultsByAppId({})
        setLoading(false)
        return
      }

      // Applications (paged)
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const base = supabase
        .from('applications')
        .select(
          'id, application_uid, applicant_name, national_id, status, created_at, officer_email, gun_uid, applicant_email'
        )
        .eq('applicant_email', email)
        .order('created_at', { ascending: false })
        .range(from, to)

      // quick search (client-side will also filter, but this reduces data a bit)
      const query = q.trim()
      const appsRes = query
        ? await base.or(`application_uid.ilike.%${query}%,national_id.ilike.%${query}%,applicant_name.ilike.%${query}%`)
        : await base

      if (appsRes.error) {
        console.error(appsRes.error)
        setApps([])
        setResultsByAppId({})
        setLoading(false)
        return
      }

      const rows = (appsRes.data ?? []) as ApplicationRow[]
      setApps(rows)

      // Results for these app ids (one query, fast)
      const ids = rows.map(r => r.id)
      if (!ids.length) {
        setResultsByAppId({})
        setLoading(false)
        return
      }

      const res2 = await supabase
        .from('application_results')
        .select('application_id, result, wallet_id, decided_at')
        .in('application_id', ids)

      if (res2.error) {
        console.error(res2.error)
        setResultsByAppId({})
        setLoading(false)
        return
      }

      const map: Record<number, ResultRow> = {}
      ;(res2.data ?? []).forEach((r: ResultRow) => {
        map[r.application_id] = r
      })

      const filled: Record<number, ResultRow | null> = {}
      ids.forEach(id => (filled[id] = map[id] ?? null))
      setResultsByAppId(filled)

      setLoading(false)
    }

    void load()
  }, [page, q])

  const rows: Row[] = useMemo(() => {
    const list = apps.map(a => ({ ...a, resultRow: resultsByAppId[a.id] ?? null }))

    // filter
    return list.filter(r => {
      if (filter === 'approved') return r.resultRow?.result === 'approved'
      if (filter === 'declined') return r.resultRow?.result === 'declined'
      if (filter === 'open') return !r.resultRow
      return true
    })
  }, [apps, resultsByAppId, filter])

  const onViewWallet = (walletId: string) => {
    // SAME place you used before (your wallet page)
    window.location.href = `/joc/controller/wallet?walletId=${encodeURIComponent(walletId)}`
  }

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4 border-r border-black/10">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="max-w-6xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1F2A35]">Applications</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Final results show as Approved / Denied. Open items show their current stage.
              </p>
            </div>

            <Button asChild className="text-white" style={{ backgroundColor: '#2F4F6F' }}>
              <Link href="/dealer/application">New Application</Link>
            </Button>
          </div>

          <Separator />

          <Card className="border-black/10 bg-white">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-[#1F2A35]">Document Register</CardTitle>
                  <CardDescription>Built for large volume: search, filter, paginate.</CardDescription>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  value={q}
                  onChange={(e) => {
                    setPage(0)
                    setQ(e.target.value)
                  }}
                  placeholder="Search by Application UID, National ID, or Name…"
                  className="sm:max-w-md"
                />

                <div className="flex gap-2">
                  <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
                    All
                  </Button>
                  <Button variant={filter === 'open' ? 'default' : 'outline'} onClick={() => setFilter('open')}>
                    Open
                  </Button>
                  <Button variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>
                    Approved
                  </Button>
                  <Button variant={filter === 'declined' ? 'default' : 'outline'} onClick={() => setFilter('declined')}>
                    Denied
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-muted-foreground">No applications found.</div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-black/10">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F7F6F2] text-[#1F2A35]">
                      <tr className="border-b border-black/10">
                        <th className="p-3 text-left font-semibold">Application UID</th>
                        <th className="p-3 text-left font-semibold">Applicant</th>
                        <th className="p-3 text-left font-semibold">National ID</th>
                        <th className="p-3 text-left font-semibold">Gun UID</th>
                        <th className="p-3 text-left font-semibold">Status</th>
                        <th className="p-3 text-left font-semibold">Created</th>
                        <th className="p-3 text-left font-semibold">Result Date</th>
                        <th className="p-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="bg-white">
                      {rows.map((r) => {
                        const result = r.resultRow
                        const walletId = (result?.wallet_id ?? '').trim()

                        return (
                          <tr key={r.application_uid} className="border-b border-black/5 hover:bg-[#FBFAF7]">
                            <td className="p-3 font-mono text-xs">{r.application_uid}</td>
                            <td className="p-3">{r.applicant_name ?? '-'}</td>
                            <td className="p-3">{r.national_id ?? '-'}</td>
                            <td className="p-3">{r.gun_uid ?? '-'}</td>
                            <td className="p-3">{badgeFor(r.status, result)}</td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(r.created_at).toLocaleString()}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {result?.decided_at ? new Date(result.decided_at).toLocaleString() : '-'}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-end gap-2">
                                {result?.result === 'approved' && walletId ? (
                                  <Button onClick={() => onViewWallet(walletId)}>View wallet</Button>
                                ) : (
                                  <Button variant="outline" disabled>
                                    No action
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Page {page + 1} • Showing up to {PAGE_SIZE} records
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))}>
                    Prev
                  </Button>
                  <Button variant="outline" disabled={loading || apps.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
