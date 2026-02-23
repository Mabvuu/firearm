// app/dealer/transfers/page.tsx
'use client'

import { useEffect, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type Transfer = {
  id: string
  gun_uid: string
  from_dealer_id: string
  to_dealer_id: string
  from_wallet: string
  to_wallet: string
  status: 'pending' | 'accepted' | 'completed' | 'failed'
  tx_sig: string | null
  created_at: string
}

export default function DealerTransfersPage() {
  const [rows, setRows] = useState<Transfer[]>([])
  const [me, setMe] = useState<string>('')

  useEffect(() => {
    let alive = true

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!alive) return

      if (!user) {
        setRows([])
        setMe('')
        return
      }

      setMe(user.id)

      const { data, error } = await supabase
        .from('transfers')
        .select('id, gun_uid, from_dealer_id, to_dealer_id, from_wallet, to_wallet, status, tx_sig, created_at')
        .eq('to_dealer_id', user.id)
        .order('created_at', { ascending: false })

      if (!alive) return

      if (error) {
        console.error(error)
        setRows([])
      } else {
        setRows((data as Transfer[]) || [])
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

  const reload = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setRows([])
      setMe('')
      return
    }

    setMe(user.id)

    const { data, error } = await supabase
      .from('transfers')
      .select('id, gun_uid, from_dealer_id, to_dealer_id, from_wallet, to_wallet, status, tx_sig, created_at')
      .eq('to_dealer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setRows([])
    } else {
      setRows((data as Transfer[]) || [])
    }
  }

  const accept = async (transferId: string) => {
    if (!me) return

    const res = await fetch('/api/dealer/transfers/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transfer_id: transferId,
        to_dealer_id: me,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      alert(data?.error || 'Accept failed')
      return
    }

    alert('Accepted + completed')
    await reload()
  }

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <Card className="border-black/10 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl text-[#1F2A35]">Transfers (Incoming)</CardTitle>
              <Button variant="outline" onClick={() => void reload()}>
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <Separator className="mb-4" />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Gun UID</TableHead>
                  <TableHead>From Dealer</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant={r.status === 'completed' ? 'default' : 'outline'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.gun_uid}</TableCell>
                    <TableCell className="font-mono text-xs">{r.from_dealer_id}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {r.status === 'pending' ? (
                        <Button size="sm" onClick={() => void accept(r.id)}>
                          Accept
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {r.tx_sig ? 'Done' : '—'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No incoming transfers
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
