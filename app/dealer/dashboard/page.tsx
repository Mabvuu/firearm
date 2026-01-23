// app/dealer/dashboard/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type InventoryRow = {
  id: number
  minted: boolean
  minted_at: string | null
}

type DashboardStats = {
  totalInventory: number
  mintedCount: number
  notMintedCount: number
  lastMintedAt: string | null
}

const COLORS = {
  bg: '#F7F6F2', // Snow White
  panel: '#E6E5E2', // Natural Aluminum
  border: '#B5B5B3', // Cool Grey Medium
  nav: '#1F2A35', // Black Blue
  accent: '#2F4F6F', // Lamar
  accentHover: '#263F5A',
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string
  value: string
  sub?: string
}) {
  return (
    <Card
      className="relative overflow-hidden border"
      style={{ backgroundColor: '#FFFFFF', borderColor: `${COLORS.border}66` }}
    >
      <div
        className="absolute top-3 right-3 h-2 w-2 rounded-full"
        style={{ backgroundColor: COLORS.accent }}
      />

      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium" style={{ color: '#6B7280' }}>
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-semibold" style={{ color: COLORS.nav }}>
          {value}
        </div>
        {sub ? (
          <div className="mt-1 text-xs" style={{ color: '#6B7280' }}>
            {sub}
          </div>
        ) : null}
      </CardContent>

      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl"
        style={{ backgroundColor: `${COLORS.panel}AA` }}
      />
    </Card>
  )
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

export default function DealerDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalInventory: 0,
    mintedCount: 0,
    notMintedCount: 0,
    lastMintedAt: null,
  })
  const [recentMints, setRecentMints] = useState<
    { id: number; minted_at: string | null }[]
  >([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)

      await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('inventory')
        .select('id,minted,minted_at')
        .order('id', { ascending: false })

      if (error) {
        console.error(error)
        setStats({
          totalInventory: 0,
          mintedCount: 0,
          notMintedCount: 0,
          lastMintedAt: null,
        })
        setRecentMints([])
        setLoading(false)
        return
      }

      const rows = (data || []) as InventoryRow[]
      const totalInventory = rows.length
      const mintedCount = rows.filter(r => r.minted).length
      const notMintedCount = totalInventory - mintedCount

      const mintedDates = rows
        .filter(r => r.minted && r.minted_at)
        .map(r => r.minted_at as string)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

      const lastMintedAt = mintedDates[0] ?? null

      setStats({
        totalInventory,
        mintedCount,
        notMintedCount,
        lastMintedAt,
      })

      const recent = rows
        .filter(r => r.minted)
        .sort((a, b) => {
          const at = a.minted_at ? new Date(a.minted_at).getTime() : 0
          const bt = b.minted_at ? new Date(b.minted_at).getTime() : 0
          return bt - at
        })
        .slice(0, 5)
        .map(r => ({ id: r.id, minted_at: r.minted_at }))

      setRecentMints(recent)
      setLoading(false)
    }

    void run()
  }, [])

  const statusLabel = useMemo(() => {
    if (loading) return 'Loading'
    if (stats.totalInventory === 0) return 'Empty'
    if (stats.notMintedCount > 0) return 'Action needed'
    return 'All minted'
  }, [loading, stats])

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <div className="w-1/4 border-r" style={{ borderColor: `${COLORS.border}66` }}>
        <NavPage />
      </div>

      <div className="w-3/4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-semibold tracking-tight"
              style={{ color: COLORS.nav }}
            >
              Dealer Dashboard
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
              Live stats from inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className="border"
              style={{
                backgroundColor: COLORS.panel,
                borderColor: `${COLORS.border}66`,
                color: COLORS.nav,
              }}
            >
              {statusLabel}
            </Badge>

            <Button
              asChild
              className="text-white"
              style={{ backgroundColor: COLORS.accent }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  COLORS.accentHover
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  COLORS.accent
              }}
            >
              <Link href="/dealer/mint">Mint Firearm</Link>
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Inventory Items"
            value={loading ? '—' : String(stats.totalInventory)}
            sub="Total in system"
          />
          <StatCard
            title="Minted"
            value={loading ? '—' : String(stats.mintedCount)}
            sub="Already on-chain"
          />
          <StatCard
            title="Not Minted"
            value={loading ? '—' : String(stats.notMintedCount)}
            sub="Needs minting"
          />
          <StatCard
            title="Last Mint"
            value={loading ? '—' : formatDate(stats.lastMintedAt)}
            sub="Most recent mint time"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card
            className="xl:col-span-1 border"
            style={{ backgroundColor: '#FFFFFF', borderColor: `${COLORS.border}66` }}
          >
            <CardHeader>
              <CardTitle className="text-base" style={{ color: COLORS.nav }}>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
                style={{
                  borderColor: `${COLORS.border}AA`,
                  color: COLORS.nav,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Link href="/dealer/mint">Mint firearms</Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
                style={{
                  borderColor: `${COLORS.border}AA`,
                  color: COLORS.nav,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Link href="/dealer/inventory">Open inventory</Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
                style={{
                  borderColor: `${COLORS.border}AA`,
                  color: COLORS.nav,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Link href="/dealer/inventory/add">Add inventory</Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
                style={{
                  borderColor: `${COLORS.border}AA`,
                  color: COLORS.nav,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Link href="/dealer/audit">Audit</Link>
              </Button>
            </CardContent>
          </Card>

          <Card
            className="xl:col-span-2 border"
            style={{ backgroundColor: '#FFFFFF', borderColor: `${COLORS.border}66` }}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base" style={{ color: COLORS.nav }}>
                Recent Mints
              </CardTitle>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hover:bg-transparent"
                style={{ color: COLORS.accent }}
              >
                <Link href="/dealer/inventory">View inventory</Link>
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-sm" style={{ color: '#6B7280' }}>
                  Loading…
                </div>
              ) : recentMints.length === 0 ? (
                <div
                  className="rounded-md border p-3"
                  style={{
                    borderColor: `${COLORS.border}66`,
                    backgroundColor: COLORS.bg,
                  }}
                >
                  <div className="text-sm font-medium" style={{ color: COLORS.nav }}>
                    No mints yet
                  </div>
                  <div className="text-xs" style={{ color: '#6B7280' }}>
                    Minted firearms will appear here.
                  </div>
                </div>
              ) : (
                recentMints.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border p-3"
                    style={{ borderColor: `${COLORS.border}66`, backgroundColor: '#FFFFFF' }}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: COLORS.nav }}>
                        Inventory #{m.id}
                      </div>
                      <div className="text-xs" style={{ color: '#6B7280' }}>
                        {formatDate(m.minted_at)}
                      </div>
                    </div>
                    <Badge
                      className="border"
                      style={{
                        backgroundColor: COLORS.panel,
                        borderColor: `${COLORS.border}66`,
                        color: COLORS.nav,
                      }}
                    >
                      Minted
                    </Badge>
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
