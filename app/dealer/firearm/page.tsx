// firearm-system/app/dealer/firearm/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type DealerFirearmRow = {
  id: number
  gun_uid: number
  application_id: number
  dealer_email: string
  new_owner_name: string
  new_owner_national_id: string
  approved_by_email: string | null
  created_at: string | null
}

type InventoryMini = {
  id: number
  make: string
  model: string
  serial: string | null
  caliber: string | null
}

type AppTrail = {
  id: number
  created_by_email: string | null
  officer_email: string | null
  oic_email: string | null
  oic_approved_by_email: string | null
  cfr_email: string | null
  dispol_email: string | null
  propol_email: string | null
  joc_oic_email: string | null
  joc_mid_email: string | null
  joc_controller_email: string | null
}

type Row = DealerFirearmRow & Partial<InventoryMini> & Partial<AppTrail>

function formatDate(date: string | null) {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleString()
  } catch {
    return '—'
  }
}

function isAppTrail(x: unknown): x is AppTrail {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.id === 'number'
}

function isInventoryMini(x: unknown): x is InventoryMini {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.id === 'number' && typeof o.make === 'string' && typeof o.model === 'string'
}

export default function DealerFirearmTransferredPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const fetchRows = async () => {
    setLoading(true)

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user?.id) {
      setRows([])
      setLoading(false)
      return
    }

    // 1) dealer_firearms
    const dfRes = await supabase
      .from('dealer_firearms')
      .select(
        'id, gun_uid, application_id, dealer_email, new_owner_name, new_owner_national_id, approved_by_email, created_at'
      )
      .eq('dealer_id', user.id)
      .order('created_at', { ascending: false })

    if (dfRes.error) {
      console.error(dfRes.error)
      setRows([])
      setLoading(false)
      return
    }

    const base = (dfRes.data ?? []) as unknown[]
    const baseTyped: DealerFirearmRow[] = base
      .filter((x) => x && typeof x === 'object')
      .map((x) => x as DealerFirearmRow)
      .filter(
        (x) =>
          typeof x.id === 'number' &&
          typeof x.gun_uid === 'number' &&
          typeof x.application_id === 'number'
      )

    if (!baseTyped.length) {
      setRows([])
      setLoading(false)
      return
    }

    const gunIds = Array.from(new Set(baseTyped.map((r) => r.gun_uid)))
    const appIds = Array.from(new Set(baseTyped.map((r) => r.application_id)))

    // 2) inventory + applications
    const invRes = await supabase
      .from('inventory')
      .select('id, make, model, serial, caliber')
      .in('id', gunIds)

    const appRes = await supabase
      .from('applications')
      .select(
        [
          'id',
          'created_by_email',
          'officer_email',
          'oic_email',
          'oic_approved_by_email',
          'cfr_email',
          'dispol_email',
          'propol_email',
          'joc_oic_email',
          'joc_mid_email',
          'joc_controller_email',
        ].join(', ')
      )
      .in('id', appIds)

    const invMap = new Map<number, InventoryMini>()
    if (!invRes.error && Array.isArray(invRes.data)) {
      for (const g of invRes.data as unknown[]) {
        if (isInventoryMini(g)) invMap.set(g.id, g)
      }
    }

    const appMap = new Map<number, AppTrail>()
    if (!appRes.error && Array.isArray(appRes.data)) {
      for (const a of appRes.data as unknown[]) {
        if (isAppTrail(a)) appMap.set(Number(a.id), a)
      }
    }

    const merged: Row[] = baseTyped.map((r) => {
      const g = invMap.get(r.gun_uid)
      const a = appMap.get(r.application_id)
      return { ...r, ...(g ?? {}), ...(a ?? {}) }
    })

    setRows(merged)
    setLoading(false)
  }

  useEffect(() => {
    const t0 = setTimeout(() => void fetchRows(), 0)
    return () => clearTimeout(t0)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const s =
        `${r.make ?? ''} ${r.model ?? ''} ${r.serial ?? ''} ${r.caliber ?? ''} ` +
        `${r.new_owner_name ?? ''} ${r.new_owner_national_id ?? ''}`
      return s.toLowerCase().includes(q)
    })
  }, [rows, query])

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <Card className="border-black/10 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-[#1F2A35]">Transferred Firearms</CardTitle>
                <div className="mt-1 text-xs text-[#1F2A35]/60">
                  Shows approvals trail + who it belongs to now
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-black/15 text-[#1F2A35]"
                  onClick={() => void fetchRows()}
                >
                  Refresh
                </Button>

                <Button asChild variant="outline" className="border-black/15 text-[#1F2A35]">
                  <Link href="/dealer/inventory">Back to Inventory</Link>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <Separator className="mb-4" />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Input
                placeholder="Search firearm / owner / id"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="max-w-md"
              />

              <Badge
                className="border"
                style={{
                  backgroundColor: '#E6E5E2',
                  borderColor: '#B5B5B366',
                  color: '#1F2A35',
                }}
              >
                {loading ? 'Loading…' : `${filtered.length} record(s)`}
              </Badge>
            </div>

            <div className="mt-4 rounded-md border border-black/10">
              {loading ? (
                <div className="p-6 text-sm text-[#1F2A35]/70">Loading…</div>
              ) : (
                <div className="max-h-[640px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Gun</TableHead>
                        <TableHead>New Owner</TableHead>
                        <TableHead>Owner ID</TableHead>

                        <TableHead>Officer</TableHead>
                        <TableHead>OIC</TableHead>
                        <TableHead>OIC Approved By</TableHead>
                        <TableHead>CFR</TableHead>
                        <TableHead>Dispol</TableHead>
                        <TableHead>Propol</TableHead>
                        <TableHead>JOC OIC</TableHead>
                        <TableHead>JOC MID</TableHead>
                        <TableHead>Controller</TableHead>

                        <TableHead>Approved By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow key={r.id} className="hover:bg-black/5">
                          <TableCell className="text-[#1F2A35]">
                            <div className="font-medium">{(r.make ?? '—') + ' ' + (r.model ?? '')}</div>
                            <div className="text-xs text-[#1F2A35]/70">
                              #{r.gun_uid} • {r.serial ?? '—'} • {r.caliber ?? '—'}
                            </div>
                          </TableCell>

                          <TableCell className="text-[#1F2A35]">{r.new_owner_name ?? '—'}</TableCell>
                          <TableCell className="font-mono text-xs text-[#1F2A35]">
                            {r.new_owner_national_id ?? '—'}
                          </TableCell>

                          <TableCell className="text-xs">{r.officer_email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{r.oic_email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{r.oic_approved_by_email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{r.cfr_email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{r.dispol_email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{r.propol_email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{r.joc_oic_email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{r.joc_mid_email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{r.joc_controller_email ?? '—'}</TableCell>

                          <TableCell className="text-xs">{r.approved_by_email ?? '—'}</TableCell>
                          <TableCell className="text-xs">{formatDate(r.created_at)}</TableCell>
                        </TableRow>
                      ))}

                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={14} className="py-10 text-center text-muted-foreground">
                            No transferred firearms yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
