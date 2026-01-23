// app/joc/controller/wallet/page.tsx
'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Wallet = {
  id: string // national_id
  applicant_name: string
  created_at: string
}

type Inventory = {
  id: number
  make: string
  model: string
  caliber: string | null
  serial: string | null
}

type WalletGunRow = {
  id: number
  wallet_id: string
  gun_uid: number
  application_id: number
  created_at: string
  inventory: Inventory | null
}

function WalletPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ✅ support BOTH routes:
  // - /wallet?walletId=... (new)
  // - /wallet?appId=... (old)
  const walletIdParam = searchParams.get('walletId')
  const appIdParam = searchParams.get('appId')

  const walletId = useMemo(() => {
    if (walletIdParam) return decodeURIComponent(walletIdParam)
    return null
  }, [walletIdParam])

  const appId = useMemo(() => {
    if (!appIdParam) return null
    const n = Number(appIdParam)
    return Number.isFinite(n) ? n : null
  }, [appIdParam])

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [walletGuns, setWalletGuns] = useState<WalletGunRow[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorMsg(null)
      setWallet(null)
      setWalletGuns([])

      if (!walletId && !appId) {
        setErrorMsg('Missing walletId or appId')
        setLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        setErrorMsg('Not logged in')
        setLoading(false)
        return
      }

      // 1) Resolve walletId from appId if needed
      let resolvedWalletId = walletId

      if (!resolvedWalletId && appId) {
        const { data: appRow, error: appErr } = await supabase
          .from('applications')
          .select('national_id')
          .eq('id', appId)
          .maybeSingle()

        if (appErr) {
          setErrorMsg(appErr.message)
          setLoading(false)
          return
        }

        if (!appRow?.national_id) {
          setErrorMsg('Application has no national_id (cannot resolve wallet)')
          setLoading(false)
          return
        }

        resolvedWalletId = String(appRow.national_id).trim()
      }

      if (!resolvedWalletId) {
        setErrorMsg('Missing walletId')
        setLoading(false)
        return
      }

      // 2) Load wallet
      const { data: walletData, error: walletErr } = await supabase
        .from('wallet')
        .select('id, applicant_name, created_at')
        .eq('id', resolvedWalletId)
        .maybeSingle()

      if (walletErr) {
        setErrorMsg(walletErr.message)
        setLoading(false)
        return
      }

      if (!walletData) {
        setErrorMsg('Wallet not found (maybe not created yet)')
        setLoading(false)
        return
      }

      setWallet(walletData as Wallet)

      // 3) Load wallet_guns
      const { data: linkRows, error: linksErr } = await supabase
        .from('wallet_guns')
        .select('id, wallet_id, gun_uid, application_id, created_at')
        .eq('wallet_id', resolvedWalletId)
        .order('created_at', { ascending: false })

      if (linksErr) {
        setErrorMsg(linksErr.message)
        setLoading(false)
        return
      }

      const links =
        (linkRows ?? []) as Array<{
          id: number
          wallet_id: string
          gun_uid: number
          application_id: number
          created_at: string
        }>

      if (!links.length) {
        setWalletGuns([])
        setLoading(false)
        return
      }

      const gunIds = Array.from(new Set(links.map(l => l.gun_uid)))

      // 4) Load inventory in one query
      const { data: invRows, error: invErr } = await supabase
        .from('inventory')
        .select('id, make, model, caliber, serial')
        .in('id', gunIds)

      if (invErr) {
        setErrorMsg(invErr.message)
        setLoading(false)
        return
      }

      const invMap = new Map<number, Inventory>()
      ;((invRows ?? []) as Inventory[]).forEach(g => invMap.set(g.id, g))

      const merged: WalletGunRow[] = links.map(l => ({
        ...l,
        inventory: invMap.get(l.gun_uid) ?? null,
      }))

      setWalletGuns(merged)
      setLoading(false)
    }

    load()
  }, [walletId, appId])

  if (loading) return <div className="p-8">Loading…</div>

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xl font-semibold">Wallet</div>
            <div className="text-sm text-muted-foreground">
              Wallet ID (National ID): <b>{wallet?.id ?? '-'}</b>
            </div>
          </div>

          <Button variant="outline" onClick={() => router.push('/joc/controller/application')}>
            Back
          </Button>
        </div>

        {errorMsg && <div className="border rounded p-3 text-sm text-red-600">{errorMsg}</div>}

        {!wallet ? (
          <Card>
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">No wallet loaded.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Owner</CardTitle>
                <Badge variant="outline">wallet</Badge>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="text-sm">
                  <b>Name:</b> {wallet.applicant_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Created: {new Date(wallet.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guns in this wallet</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {!walletGuns.length ? (
                  <div className="text-sm text-muted-foreground">No guns linked yet.</div>
                ) : (
                  <div className="space-y-2">
                    {walletGuns.map(row => (
                      <div key={row.id} className="border rounded p-3">
                        {!row.inventory ? (
                          <div className="text-sm text-muted-foreground">Gun not found.</div>
                        ) : (
                          <div className="text-sm space-y-1">
                            <div>
                              <b>Make:</b> {row.inventory.make}
                            </div>
                            <div>
                              <b>Model:</b> {row.inventory.model}
                            </div>
                            <div>
                              <b>Caliber:</b> {row.inventory.caliber}
                            </div>
                            <div>
                              <b>Serial:</b> {row.inventory.serial}
                            </div>
                            <div className="text-xs text-muted-foreground pt-1">
                              Linked from application #{row.application_id} •{' '}
                              {new Date(row.created_at).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <WalletPageInner />
    </Suspense>
  )
}
