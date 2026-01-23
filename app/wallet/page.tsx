// app/wallet/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Inventory = {
  id: number
  make: string
  model: string
  caliber: string | null
  serial: string | null
}

type Wallet = {
  id: string
  applicant_name: string
  created_at: string
}

type PublicWalletResponse = {
  wallet: Wallet | null
  guns: Array<{
    gun_uid: number
    application_id: number
    created_at: string
    gun: Inventory
  }>
}

export default function PublicWalletLookupPage() {
  const [nationalId, setNationalId] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [data, setData] = useState<PublicWalletResponse | null>(null)

  const canSearch = useMemo(() => nationalId.trim().length > 0, [nationalId])

  const onSearch = async () => {
    const id = nationalId.trim()
    if (!id) return

    setLoading(true)
    setErrorMsg(null)
    setData(null)

    const { data: rpcData, error } = await supabase.rpc('get_wallet_public', {
      p_wallet_id: id,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    const parsed = rpcData as PublicWalletResponse

    if (!parsed?.wallet) {
      setErrorMsg('Wallet not found')
      setLoading(false)
      return
    }

    setData(parsed)
    setLoading(false)
  }

  return (
    <div className="min-h-screen p-6 md:p-10 flex justify-center">
      <div className="w-full max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Public Wallet Lookup</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Enter National ID to view wallet details.
            </div>

            <div className="flex gap-2">
              <Input
                value={nationalId}
                onChange={e => setNationalId(e.target.value)}
                placeholder="National ID"
              />
              <Button disabled={!canSearch || loading} onClick={onSearch}>
                {loading ? 'Searching…' : 'Search'}
              </Button>
            </div>

            {errorMsg && (
              <div className="border rounded p-3 text-sm text-red-600">
                {errorMsg}
              </div>
            )}
          </CardContent>
        </Card>

        {data?.wallet && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Owner</CardTitle>
                <Badge variant="outline">Wallet</Badge>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>
                  <b>Wallet ID:</b> {data.wallet.id}
                </div>
                <div>
                  <b>Name:</b> {data.wallet.applicant_name}
                </div>
                <div className="text-muted-foreground">
                  Created: {new Date(data.wallet.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guns</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                {!data.guns?.length ? (
                  <div className="text-sm text-muted-foreground">No guns linked yet.</div>
                ) : (
                  data.guns.map((g, idx) => (
                    <div key={`${g.gun_uid}-${idx}`} className="border rounded p-3 text-sm">
                      <div><b>Make:</b> {g.gun.make}</div>
                      <div><b>Model:</b> {g.gun.model}</div>
                      <div><b>Caliber:</b> {g.gun.caliber}</div>
                      <div><b>Serial:</b> {g.gun.serial}</div>
                      <div className="text-xs text-muted-foreground pt-2">
                        Added via application #{g.application_id} •{' '}
                        {new Date(g.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
