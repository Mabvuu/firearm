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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type MintFilter = 'ALL' | 'MINTED' | 'NOT_MINTED'

type OwnershipState = 'DEALER' | 'CIVILIAN' | 'REPOSSESSED' | string

type Gun = {
  id: number
  gun_uid: string
  make: string
  model: string
  caliber: string | null
  serial: string | null
  date_of_import: string | null
  minted: boolean
  ownership_state: OwnershipState | null
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}
function formatDate(date: string | null) {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`
}

export default function InventoryListPage() {
  const [inventory, setInventory] = useState<Gun[]>([])
  const [query, setQuery] = useState('')
  const [mintFilter, setMintFilter] = useState<MintFilter>('ALL')

  // send dialog
  const [sendOpen, setSendOpen] = useState(false)
  const [selectedGun, setSelectedGun] = useState<Gun | null>(null)
  const [toEmail, setToEmail] = useState('')
  const [dealerCheck, setDealerCheck] = useState<'idle' | 'checking' | 'ok' | 'notfound'>('idle')
  const [sending, setSending] = useState(false)

  const refresh = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setInventory([])
      return
    }

    const { data, error } = await supabase
      .from('inventory')
      .select('id, gun_uid, make, model, caliber, serial, date_of_import, minted, ownership_state')
      .eq('owner_id', user.id)
      .neq('ownership_state', 'CIVILIAN')
      .order('id', { ascending: true })

    if (error) {
      console.error(error)
      setInventory([])
    } else {
      setInventory((data as Gun[]) || [])
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const mintGun = async (inventoryId: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return alert('Not logged in')

    const res = await fetch('/api/dealer/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory_id: inventoryId, dealer_id: user.id }),
    })
    const data = await res.json()
    if (!res.ok) return alert(data?.error || 'Mint failed')
    await refresh()
  }

  const openSend = (g: Gun) => {
    setSelectedGun(g)
    setToEmail('')
    setDealerCheck('idle')
    setSendOpen(true)
  }

  const checkDealer = async () => {
    const email = toEmail.trim().toLowerCase()
    if (!email) return
    setDealerCheck('checking')
    const res = await fetch(`/api/dealer/lookup?email=${encodeURIComponent(email)}`)
    setDealerCheck(res.ok ? 'ok' : 'notfound')
  }

  const submitSend = async () => {
    if (!selectedGun) return
    if (dealerCheck !== 'ok') return alert('Confirm dealer first')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return alert('Not logged in')
    if (!selectedGun.minted) return alert('Mint the gun first')

    setSending(true)
    try {
      const res = await fetch('/api/dealer/transfers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gun_uid: selectedGun.gun_uid,
          from_dealer_id: user.id,
          to_email: toEmail.trim().toLowerCase(),
        }),
      })
      const data = await res.json()
      if (!res.ok) return alert(data?.error || 'Failed')
      alert('Transfer created (pending)')
      setSendOpen(false)
      setSelectedGun(null)
    } finally {
      setSending(false)
    }
  }

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

  const stateBadge = (state: OwnershipState | null) => {
    const s = (state ?? '').toUpperCase()
    if (s === 'REPOSSESSED') return <Badge variant="destructive">Repossessed</Badge>
    if (s === 'DEALER') return <Badge>Dealer</Badge>
    if (s === 'CIVILIAN') return <Badge variant="secondary">Civilian</Badge>
    return <Badge variant="outline">{state ?? '—'}</Badge>
  }

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between gap-3">
              <CardTitle>My Inventory</CardTitle>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/dealer/transfers">Transfers</Link>
                </Button>
                <Button asChild>
                  <Link href="/dealer/inventory/add">Add</Link>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Separator className="mb-4" />

            <div className="flex gap-2 mb-4">
              <Input placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />
              <select
                value={mintFilter}
                onChange={e => setMintFilter(e.target.value as MintFilter)}
                className="h-10 rounded-md border px-3"
              >
                <option value="ALL">All</option>
                <option value="NOT_MINTED">Not Minted</option>
                <option value="MINTED">Minted</option>
              </select>
              <Button variant="outline" onClick={() => void refresh()}>
                Refresh
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Make</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Caliber</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Minted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map(g => (
                  <TableRow key={g.id}>
                    <TableCell>{g.make}</TableCell>
                    <TableCell>{g.model}</TableCell>
                    <TableCell>{g.caliber ?? '—'}</TableCell>
                    <TableCell>{g.serial ?? '—'}</TableCell>
                    <TableCell>{formatDate(g.date_of_import)}</TableCell>

                    {/* ✅ shows repossessed clearly */}
                    <TableCell>{stateBadge(g.ownership_state)}</TableCell>

                    <TableCell>
                      {g.minted ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}
                    </TableCell>

                    <TableCell className="flex gap-2">
                      {g.minted ? (
                        <Button size="sm" variant="outline" onClick={() => openSend(g)}>
                          Send to Dealer
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => void mintGun(g.id)}>
                          Mint
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No inventory
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Send dialog */}
        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Send to Dealer</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <Label>Dealer Email</Label>
              <div className="flex gap-2">
                <Input
                  value={toEmail}
                  onChange={e => {
                    setToEmail(e.target.value)
                    setDealerCheck('idle')
                  }}
                  placeholder="dealer@example.com"
                />
                <Button variant="outline" onClick={() => void checkDealer()}>
                  {dealerCheck === 'checking' ? 'Checking…' : 'Check'}
                </Button>
              </div>

              {dealerCheck === 'ok' && <span className="text-sm text-green-600">✓ Dealer exists</span>}
              {dealerCheck === 'notfound' && <span className="text-sm text-red-600">✗ Dealer not found</span>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={() => void submitSend()} disabled={sending || dealerCheck !== 'ok'}>
                Create Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}