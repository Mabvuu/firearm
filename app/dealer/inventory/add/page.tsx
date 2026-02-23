// app/dealer/inventory/add/page.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavPage from '../../nav/page'
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

type GunRow = {
  serial: string
  make: string
  model: string
  caliber: string
  dateOfImport: string // ISO YYYY-MM-DD from calendar
}

const MAKES = [
  'Glock',
  'SIG Sauer',
  'Beretta',
  'Smith & Wesson',
  'Heckler & Koch',
  'CZ',
  'Ruger',
  'Walther',
  'Taurus',
  'FN Herstal',
] as const

type Make = (typeof MAKES)[number]

const MODELS_BY_MAKE: Record<Make, string[]> = {
  Glock: ['17', '19', '26', '43', '45', '34', '48', '21', '22', '23'],
  'SIG Sauer': ['P226', 'P229', 'P320', 'P365', 'P220', 'P210', 'P250', 'P238', 'SP2022', 'P224'],
  Beretta: ['92FS', 'M9', 'PX4 Storm', 'APX', '84FS', '96', '70', '21A Bobcat', '3032 Tomcat', '92X'],
  'Smith & Wesson': ['M&P9', 'M&P40', 'M&P Shield', 'Model 10', 'Model 19', 'Model 29', 'SD9', 'SW1911', 'M&P 2.0', 'Bodyguard'],
  'Heckler & Koch': ['USP', 'VP9', 'P30', 'HK45', 'P2000', 'P7', 'VP40', 'HK45C', 'VP9SK', 'USP Compact'],
  CZ: ['75', 'P-10 C', 'P-07', 'P-09', 'Shadow 2', 'SP-01', 'RAMI', '97B', 'Scorpion', 'TS 2'],
  Ruger: ['Security-9', 'SR9', 'LCP', 'LC9', 'GP100', 'SP101', 'Mark IV', 'American Pistol', 'Max-9', 'Redhawk'],
  Walther: ['PPQ', 'PDP', 'P99', 'PPK', 'PPS', 'Q5 Match', 'PK380', 'CCP', 'P22', 'P38'],
  Taurus: ['G2C', 'G3C', 'TX22', 'PT92', 'Judge', '605', '856', 'TH9', 'GX4', 'Raging Bull'],
  'FN Herstal': ['FN 509', 'FNX-45', 'FNS-9', 'Five-seveN', 'FN 510', 'FN 545', 'Reflex', 'FNX-9', 'FNP-45', 'FNS-40'],
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function ddmmyyyyFromISO(iso: string) {
  // iso: YYYY-MM-DD
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${pad2(Number(d))}-${pad2(Number(m))}-${y}`
}

function ddmmyyFromISO(iso: string) {
  const full = ddmmyyyyFromISO(iso)
  if (!full) return ''
  // DD-MM-YYYY -> DD-MM-YY
  return `${full.slice(0, 6)}${full.slice(8, 10)}`
}

export default function InventoryAddPage() {
  const router = useRouter()
  const [isBulk, setIsBulk] = useState(false)
  const [bulkCount, setBulkCount] = useState(1)
  const [saving, setSaving] = useState(false)

  const [guns, setGuns] = useState<GunRow[]>([
    { serial: '', make: '', model: '', caliber: '', dateOfImport: '' },
  ])

  const makeList = useMemo(() => [...MAKES], [])
  const modelsByMake = useMemo(() => MODELS_BY_MAKE, [])

  const setRow = (index: number, patch: Partial<GunRow>) => {
    setGuns(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const setSingle = (patch: Partial<GunRow>) => {
    setIsBulk(false)
    setBulkCount(1)
    setGuns(prev => [{ ...prev[0], ...patch }])
  }

  const handleBulkCountChange = (count: number) => {
    const safe = Math.max(1, Math.min(100, count || 1))
    setBulkCount(safe)

    setGuns(prev => {
      const first =
        prev[0] ?? { serial: '', make: '', model: '', caliber: '', dateOfImport: '' }
      const next: GunRow[] = [{ ...first, serial: '' }]
      for (let i = 1; i < safe; i++) {
        next.push({
          make: first.make,
          model: first.model,
          caliber: first.caliber,
          dateOfImport: first.dateOfImport,
          serial: '',
        })
      }
      return next
    })
  }

  const handleBulkInit = () => {
    setIsBulk(true)
    handleBulkCountChange(Math.max(2, bulkCount))
  }

  const errors = useMemo(() => {
    const msgs: string[] = []
    if (guns.some(g => !g.serial.trim())) msgs.push('Serial is required.')
    if (guns.some(g => !g.make)) msgs.push('Pick a Make.')
    if (guns.some(g => !g.model)) msgs.push('Pick a Model.')
    if (guns.some(g => !g.caliber.trim())) msgs.push('Caliber is required.')
    if (guns.some(g => !g.dateOfImport)) msgs.push('Pick a Date.')
    const serials = guns.map(g => g.serial.trim())
    if (new Set(serials).size !== serials.length) msgs.push('Serial numbers must be unique.')
    return msgs
  }, [guns])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (errors.length) {
      alert(errors[0])
      return
    }

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('Not logged in')
        return
      }

      const payload = guns.map(g => ({
  serial: g.serial.trim(),
  make: g.make,
  model: g.model,
  caliber: g.caliber.trim(),
  date_of_import: g.dateOfImport,
  owner_id: user.id,
}))


      const { error } = await supabase.from('inventory').insert(payload)

      if (error) {
        console.error(error)
        alert('Failed to add inventory')
        return
      }

      router.push('/dealer/inventory')
    } finally {
      setSaving(false)
    }
  }

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
                  <CardTitle className="text-xl text-[#1F2A35]">Add Inventory</CardTitle>
                  <div className="mt-1 text-xs text-[#1F2A35]/60">
                    Calendar date saved as ISO, displayed as DD-MM-YYYY + small DD-MM-YY under it
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-black/15 text-[#1F2A35]"
                    onClick={() => router.push('/dealer/inventory')}
                    type="button"
                  >
                    ← Back
                  </Button>

                  <Button
                    type="submit"
                    form="add-inventory-form"
                    className="text-white"
                    style={{ backgroundColor: '#2F4F6F' }}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Add Inventory'}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <Separator className="mb-4" />

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#1F2A35]">
                    <input
                      type="radio"
                      checked={!isBulk}
                      onChange={() => {
                        setIsBulk(false)
                        setBulkCount(1)
                        setGuns(prev => [prev[0] ?? { serial: '', make: '', model: '', caliber: '', dateOfImport: '' }])
                      }}
                    />
                    Single
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[#1F2A35]">
                    <input type="radio" checked={isBulk} onChange={handleBulkInit} />
                    Bulk
                  </label>

                  {isBulk && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#1F2A35]/70">Count</span>
                      <Input
                        type="number"
                        min={2}
                        max={100}
                        value={bulkCount}
                        onChange={e => handleBulkCountChange(Number(e.target.value))}
                        className="h-9 w-24"
                      />
                    </div>
                  )}
                </div>

                <Badge
                  className="border"
                  style={{
                    backgroundColor: '#E6E5E2',
                    borderColor: '#B5B5B366',
                    color: '#1F2A35',
                  }}
                >
                  {guns.length} row(s)
                </Badge>
              </div>

              {errors.length > 0 && (
                <div className="mt-3 rounded-md border border-black/10 bg-[#F7F6F2] p-3 text-sm text-[#1F2A35]/80">
                  {errors[0]}
                </div>
              )}

              <form id="add-inventory-form" onSubmit={handleSubmit} className="mt-4">
                <div className="rounded-md border border-black/10">
                  <div className="max-h-[560px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white">
                        <TableRow className="h-10">
                          <TableHead className="h-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1F2A35]/70">
                            #
                          </TableHead>
                          <TableHead className="h-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1F2A35]/70">
                            Make
                          </TableHead>
                          <TableHead className="h-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1F2A35]/70">
                            Model
                          </TableHead>
                          <TableHead className="h-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1F2A35]/70">
                            Caliber
                          </TableHead>
                          <TableHead className="h-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1F2A35]/70">
                            Date of Import
                          </TableHead>
                          <TableHead className="h-10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#1F2A35]/70">
                            Serial
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {guns.map((g, i) => {
                          const mk = g.make as Make
                          const models = mk && modelsByMake[mk] ? modelsByMake[mk] : []

                          return (
                            <TableRow key={i} className="h-9 hover:bg-black/5">
                              <TableCell className="px-3 py-2 text-center text-sm text-[#1F2A35]/70">
                                {i + 1}
                              </TableCell>

                              <TableCell className="px-3 py-2">
                                {/* ✅ SELECT WORKS: no mixing single/bulk inside onChange */}
                                <select
                                  value={g.make}
                                  onChange={e => {
                                    const nextMake = e.target.value
                                    if (isBulk) {
                                      setRow(i, { make: nextMake, model: '' })
                                    } else {
                                      setSingle({ make: nextMake, model: '' })
                                    }
                                  }}
                                  className="h-9 w-full rounded-md border border-black/15 bg-white px-3 text-sm text-[#1F2A35] focus:outline-none"
                                >
                                  <option value="">Choose make…</option>
                                  {makeList.map(m => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                              </TableCell>

                              <TableCell className="px-3 py-2">
                                <select
                                  value={g.model}
                                  onChange={e => {
                                    const v = e.target.value
                                    if (isBulk) setRow(i, { model: v })
                                    else setSingle({ model: v })
                                  }}
                                  disabled={!g.make}
                                  className="h-9 w-full rounded-md border border-black/15 bg-white px-3 text-sm text-[#1F2A35] focus:outline-none disabled:opacity-50"
                                >
                                  <option value="">{g.make ? 'Choose model…' : 'Pick make first'}</option>
                                  {models.map(m => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                              </TableCell>

                              <TableCell className="px-3 py-2">
                                <Input
                                  value={g.caliber}
                                  onChange={e => {
                                    const v = e.target.value
                                    if (isBulk) setRow(i, { caliber: v })
                                    else setSingle({ caliber: v })
                                  }}
                                  className="h-9"
                                  placeholder="e.g. 9mm"
                                />
                              </TableCell>

                              <TableCell className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                  {/* Calendar input stays ISO but we DISPLAY your format */}
                                  <Input
                                    type="date"
                                    value={g.dateOfImport}
                                    onChange={e => {
                                      const v = e.target.value
                                      if (isBulk) setRow(i, { dateOfImport: v })
                                      else setSingle({ dateOfImport: v })
                                    }}
                                    className="h-9"
                                  />

                                  <div className="text-[12px] text-[#1F2A35]/70">
                                    {g.dateOfImport ? ddmmyyyyFromISO(g.dateOfImport) : 'DD-MM-YYYY'}
                                  </div>

                                  <div className="text-[11px] text-[#1F2A35]/50">
                                    {g.dateOfImport ? ddmmyyFromISO(g.dateOfImport) : 'DD-MM-YY'}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="px-3 py-2">
                                <Input
                                  value={g.serial}
                                  onChange={e => setRow(i, { serial: e.target.value })}
                                  className="h-9"
                                  placeholder="Serial"
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
