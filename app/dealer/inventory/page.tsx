// app/dealer/inventory/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import NavPage from '../nav/page'
import Link from 'next/link'
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

type MintFilter = 'ALL' | 'MINTED' | 'NOT_MINTED'

type Gun = {
  id: number
  make: string
  model: string
  caliber: string | null
  serial: string | null
  date_of_import: string | null
  minted: boolean
  minted_at: string | null

  // optional UI fields if you have them
  ownership_state?: string | null
}

function formatDate(date: string | null) {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString()
  } catch {
    return '—'
  }
}

export default function InventoryListPage() {
  const [inventory, setInventory] = useState<Gun[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [mintFilter, setMintFilter] = useState<MintFilter>('ALL')

  useEffect(() => {
    const fetchInventoryAsync = async () => {
      setLoading(true)

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user?.id) {
        setInventory([])
        setLoading(false)
        return
      }

      // ✅ ONLY guns still owned by this dealer
      const { data, error } = await supabase
        .from('inventory')
        .select('id, make, model, caliber, serial, date_of_import, minted, minted_at, ownership_state')
        .eq('owner_id', user.id)
        .order('id', { ascending: true })

      if (error) {
        console.error(error)
        setInventory([])
      } else {
        setInventory((data as Gun[]) || [])
      }

      setLoading(false)
    }

    void fetchInventoryAsync()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return inventory.filter(g => {
      if (mintFilter === 'MINTED' && !g.minted) return false
      if (mintFilter === 'NOT_MINTED' && g.minted) return false
      if (!q) return true

      return `${g.make} ${g.model} ${g.caliber ?? ''} ${g.serial ?? ''}`
        .toLowerCase()
        .includes(q)
    })
  }, [inventory, query, mintFilter])

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="max-w-6xl">
          <Card className="border-black/10 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-[#1F2A35]">My Inventory</CardTitle>
                  <div className="mt-1 text-xs text-[#1F2A35]/60">
                    Only firearms currently in your possession
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" className="border-black/15 text-[#1F2A35]">
                    <Link href="/dealer/mint">Mint</Link>
                  </Button>

                  <Button asChild className="text-white" style={{ backgroundColor: '#2F4F6F' }}>
                    <Link href="/dealer/inventory/add">Add</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <Separator className="mb-4" />

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Input
                    placeholder="Search make / model / serial / caliber"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="max-w-md"
                  />

                  <select
                    value={mintFilter}
                    onChange={e => setMintFilter(e.target.value as MintFilter)}
                    className="h-10 rounded-md border border-black/15 bg-white px-3 text-sm text-[#1F2A35] focus:outline-none"
                  >
                    <option value="ALL">All</option>
                    <option value="NOT_MINTED">Not Minted</option>
                    <option value="MINTED">Minted</option>
                  </select>
                </div>

                <Badge
                  className="border"
                  style={{
                    backgroundColor: '#E6E5E2',
                    borderColor: '#B5B5B366',
                    color: '#1F2A35',
                  }}
                >
                  {loading ? 'Loading…' : `${filtered.length} item(s)`}
                </Badge>
              </div>

              <div className="mt-4 rounded-md border border-black/10">
                {loading ? (
                  <div className="p-6 text-sm text-[#1F2A35]/70">Loading…</div>
                ) : (
                  <div className="max-h-[560px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white">
                        <TableRow>
                          <TableHead>Make</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Caliber</TableHead>
                          <TableHead>Serial</TableHead>
                          <TableHead>Date Entered</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Minted</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {filtered.map(g => (
                          <TableRow key={g.id} className="hover:bg-black/5">
                            <TableCell className="font-medium text-[#1F2A35]">{g.make}</TableCell>
                            <TableCell className="text-[#1F2A35]">{g.model}</TableCell>
                            <TableCell className="text-[#1F2A35]">{g.caliber ?? '—'}</TableCell>
                            <TableCell className="font-mono text-xs text-[#1F2A35]">{g.serial ?? '—'}</TableCell>
                            <TableCell className="text-[#1F2A35]">{formatDate(g.date_of_import)}</TableCell>

                            <TableCell>
                              {g.ownership_state === 'UNDER_REVIEW' ? (
                                <Badge variant="outline" className="border-black/15 text-[#1F2A35]">
                                  Under review
                                </Badge>
                              ) : (
                                <Badge className="text-white" style={{ backgroundColor: '#2F4F6F' }}>
                                  In possession
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell>
                              {g.minted ? (
                                <Badge className="text-white" style={{ backgroundColor: '#2F4F6F' }}>
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-black/15 text-[#1F2A35]">
                                  No
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}

                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                              No inventory found
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
    </div>
  )
}
