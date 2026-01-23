// app/dealer/mint/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { mintFirearm, initializeProgram } from '@/lib/solana/client'

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

type PublicKeyLike = { toString: () => string }

type SolanaProvider = {
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKeyLike }>
  publicKey?: PublicKeyLike | null
}

type WindowWithSolana = Window & {
  solana?: SolanaProvider
  phantom?: { solana?: SolanaProvider }
  solflare?: SolanaProvider
  backpack?: SolanaProvider
}

function getProvider(): SolanaProvider | null {
  const w = window as unknown as WindowWithSolana
  return w.phantom?.solana ?? w.solflare ?? w.backpack ?? w.solana ?? null
}

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

export default function MintPage() {
  const [inventory, setInventory] = useState<InventoryGun[]>([])
  const [query, setQuery] = useState('')
  const [selectedGun, setSelectedGun] = useState<InventoryGun | null>(null)
  const [loading, setLoading] = useState(false)

  const [walletAddr, setWalletAddr] = useState<string>('')
  const [walletStatus, setWalletStatus] = useState<'DISCONNECTED' | 'SAVED' | 'CONNECTED'>('DISCONNECTED')

  useEffect(() => {
    const initWallet = async () => {
      const stored = localStorage.getItem('registeredSolWallet')
      if (stored) {
        setWalletAddr(stored)
        setWalletStatus('SAVED')
      }

      const provider = getProvider()
      if (!provider) return

      try {
        const res = await provider.connect({ onlyIfTrusted: true })
        const addr = res.publicKey.toString()
        setWalletAddr(addr)
        setWalletStatus('CONNECTED')
        localStorage.setItem('registeredSolWallet', addr)
      } catch {
        // ignore
      }
    }

    setTimeout(() => void initWallet(), 0)
  }, [])

  useEffect(() => {
    const fetchInventory = async () => {
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
        return
      }

      setInventory((inv as InventoryGun[]) || [])
    }

    void fetchInventory()
  }, [])

  const filteredInventory = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return inventory
    return inventory.filter(g => `${g.serial} ${g.make} ${g.model} ${g.caliber}`.toLowerCase().includes(q))
  }, [inventory, query])

  async function connectWallet() {
    const provider = getProvider()
    if (!provider) {
      alert('Install a Solana wallet (Phantom / Solflare / Backpack)')
      return
    }

    try {
      const res = await provider.connect()
      const addr = res.publicKey.toString()
      setWalletAddr(addr)
      setWalletStatus('CONNECTED')
      localStorage.setItem('registeredSolWallet', addr)
    } catch (e) {
      console.error(e)
      alert('Wallet connection failed')
    }
  }

  async function mintGun() {
    if (!selectedGun) {
      alert('Select a firearm first')
      return
    }

    const provider = getProvider()
    if (!provider) {
      alert('Install a Solana wallet (Phantom / Solflare / Backpack)')
      return
    }

    setLoading(true)
    try {
      // init if needed; ignore if already initialized
      try {
        await initializeProgram()
      } catch (e) {
        console.warn('initializeProgram skipped:', e)
      }

      const dateBroughtIn = Math.floor(new Date(selectedGun.date_of_import).getTime() / 1000)

      const sig = await mintFirearm({
        serial: selectedGun.serial,
        make: selectedGun.make,
        model: selectedGun.model,
        caliber: selectedGun.caliber,
        dateBroughtIn,
        ownerId: 'OWNER-ID-123',
      })

      const { error: upErr } = await supabase
        .from('inventory')
        .update({ minted: true })
        .eq('id', selectedGun.id)

      if (upErr) {
        console.error(upErr)
        alert('Minted on-chain but failed to update Supabase inventory.minted')
        return
      }

      setInventory(prev => prev.filter(g => g.id !== selectedGun.id))
      setSelectedGun(null)
      setQuery('')

      alert(`Minted.\nTx: ${sig}`)
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
              style={{
                backgroundColor: '#E6E5E2',
                borderColor: '#B5B5B366',
                color: '#1F2A35',
              }}
            >
              {walletStatus === 'CONNECTED'
                ? 'Wallet connected'
                : walletStatus === 'SAVED'
                ? 'Wallet saved'
                : 'Wallet not connected'}
            </Badge>

            <Button onClick={connectWallet} variant="outline" className="border-black/20 text-[#1F2A35]">
              {walletAddr ? `${walletAddr.slice(0, 4)}...${walletAddr.slice(-4)}` : 'Connect Wallet'}
            </Button>
          </div>
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
                onChange={e => setQuery(e.target.value)}
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
                    filteredInventory.map(g => {
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
                  <div className="text-sm"><b>Serial:</b> {selectedGun.serial}</div>
                  <div className="text-sm"><b>Make:</b> {selectedGun.make}</div>
                  <div className="text-sm"><b>Model:</b> {selectedGun.model}</div>
                  <div className="text-sm"><b>Caliber:</b> {selectedGun.caliber}</div>
                  <div className="text-sm"><b>Date:</b> {formatDate(selectedGun.date_of_import)}</div>
                </div>
              )}

              <Button
                onClick={mintGun}
                disabled={loading || !selectedGun}
                className="w-full text-white"
                style={{ backgroundColor: '#2F4F6F' }}
              >
                {loading ? 'Minting…' : 'Mint Firearm'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
