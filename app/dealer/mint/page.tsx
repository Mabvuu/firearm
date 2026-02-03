// firearm-system/app/dealer/mint/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type InventoryGun = {
  id: number
  serial: string
  make: string
  model: string
  caliber: string
  date_of_import: string
  minted: boolean
}

type DealerCreditsRow = {
  balance: number
}

type MintOk = { ok: true; txSig?: string; firearmPda?: string }
type MintFail = { ok: false; error: string }
type MintResponse = MintOk | MintFail

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString()
  } catch {
    return d
  }
}

function toErrMessage(err: unknown) {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unknown error'
  }
}

async function safeReadJson(res: Response): Promise<MintResponse> {
  const txt = await res.text()
  if (!txt) return { ok: false, error: `Empty response (HTTP ${res.status})` }
  try {
    return JSON.parse(txt) as MintResponse
  } catch {
    return { ok: false, error: `Non-JSON response (HTTP ${res.status}): ${txt.slice(0, 200)}` }
  }
}

export default function MintPage() {
  const [inventory, setInventory] = useState<InventoryGun[]>([])
  const [query, setQuery] = useState('')
  const [selectedGun, setSelectedGun] = useState<InventoryGun | null>(null)
  const [loading, setLoading] = useState(false)

  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return

      const { data: inv, error } = await supabase
        .from('inventory')
        .select('id,serial,make,model,caliber,date_of_import,minted')
        .eq('minted', false)
        .eq('owner_id', user.id)

      if (error) {
        console.error(error)
        setInventory([])
      } else {
        setInventory((inv as InventoryGun[]) || [])
      }

      // credits now come from dealer_credits.balance (not dealer_wallets)
      const { data: c, error: cErr } = await supabase
        .from('dealer_credits')
        .select('balance')
        .eq('dealer_id', user.id)
        .maybeSingle<DealerCreditsRow>()

      if (!cErr && c) setCredits(typeof c.balance === 'number' ? c.balance : 0)
      else setCredits(0)
    }

    setTimeout(() => void init(), 0)
  }, [])

  const filteredInventory = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return inventory
    return inventory.filter((g) =>
      `${g.serial} ${g.make} ${g.model} ${g.caliber}`.toLowerCase().includes(q)
    )
  }, [inventory, query])

  async function mintGun() {
    if (!selectedGun) return alert('Select a firearm first')
    if ((credits ?? 0) <= 0) return alert('No credits. Please renew / buy credits.')

    setLoading(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return alert('Not logged in')

      // NEW payload keys must match backend route.ts
      const res = await fetch('/api/dealer/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealer_id: user.id, inventory_id: selectedGun.id }),
      })

      const json = await safeReadJson(res)

      if (!res.ok || !json.ok) {
        alert(json.ok ? 'Mint failed' : json.error || 'Mint failed')
        return
      }

      setInventory((prev) => prev.filter((g) => g.id !== selectedGun.id))
      setSelectedGun(null)
      setQuery('')

      // our backend consumes 1 credit, so reflect it locally
      setCredits((c) => (typeof c === 'number' ? Math.max(0, c - 1) : c))

      alert(`Minted.\nTx: ${json.txSig ?? 'submitted'}`)
    } catch (err: unknown) {
      console.error(err)
      alert(`Mint failed: ${toErrMessage(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4 border-r border-black/10">
        <NavPage />
      </div>

      <div className="w-3/4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2A35]">Mint Firearm (Solana)</h1>
            <p className="text-sm text-muted-foreground mt-1">Select a firearm from inventory, then mint.</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className="border"
              style={{ backgroundColor: '#E6E5E2', borderColor: '#B5B5B366', color: '#1F2A35' }}
            >
              Wallet: Managed
            </Badge>
            <Badge
              className="border"
              style={{ backgroundColor: '#E6E5E2', borderColor: '#B5B5B366', color: '#1F2A35' }}
            >
              Credits: {credits === null ? '—' : credits}
            </Badge>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-[#1F2A35]/60">
          Wallet is handled by the platform (no Phantom needed).
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border-black/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#1F2A35]">Inventory to mint</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <Input
                placeholder="Search serial, make, model, caliber"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="rounded-md border border-black/10 bg-white">
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-black/10">
                  {filteredInventory.length} item(s)
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {filteredInventory.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      No inventory found.
                      <div className="mt-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/dealer/inventory/add">Add inventory</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    filteredInventory.map((g) => {
                      const active = selectedGun?.id === g.id
                      return (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGun(g)}
                          className={`w-full text-left px-3 py-3 border-b border-black/5 hover:bg-black/5 ${
                            active ? 'bg-black/5' : ''
                          }`}
                        >
                          <div className="text-sm font-medium text-[#1F2A35]">
                            {g.serial} • {g.make} {g.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {g.caliber} • Imported: {formatDate(g.date_of_import)}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-black/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#1F2A35]">Selected firearm</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {!selectedGun ? (
                <div className="rounded-md border border-black/10 bg-white p-4 text-sm text-muted-foreground">
                  Pick a firearm from the list.
                </div>
              ) : (
                <div className="rounded-md border border-black/10 bg-white p-4 space-y-2">
                  <div className="text-sm">
                    <b>Serial:</b> {selectedGun.serial}
                  </div>
                  <div className="text-sm">
                    <b>Make:</b> {selectedGun.make}
                  </div>
                  <div className="text-sm">
                    <b>Model:</b> {selectedGun.model}
                  </div>
                  <div className="text-sm">
                    <b>Caliber:</b> {selectedGun.caliber}
                  </div>
                  <div className="text-sm">
                    <b>Date:</b> {formatDate(selectedGun.date_of_import)}
                  </div>
                </div>
              )}

              <Button
                onClick={mintGun}
                disabled={loading || !selectedGun || (credits ?? 0) <= 0}
                className="w-full text-white"
                style={{ backgroundColor: '#2F4F6F' }}
              >
                {loading ? 'Minting…' : (credits ?? 0) <= 0 ? 'No Credits' : 'Mint Firearm'}
              </Button>

              {(credits ?? 0) <= 0 ? (
                <div className="text-xs text-[#B65A4A]">You have no credits. Please renew / buy credits.</div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
