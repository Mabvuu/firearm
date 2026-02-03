// app/dealer/renew/page.tsx
'use client'

import { useEffect, useState } from 'react'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function RenewPage() {
  const [credits, setCredits] = useState<number | null>(null)
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return

      setEmail(user.email ?? '')

      const { data: w } = await supabase
        .from('dealer_wallets')
        .select('credits')
        .eq('dealer_id', user.id)
        .maybeSingle()

      setCredits(typeof w?.credits === 'number' ? w.credits : 0)
    }

    void init()
  }, [])

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4 border-r border-black/10">
        <NavPage />
      </div>

      <div className="w-3/4 p-6">
        <h1 className="text-2xl font-bold text-[#1F2A35] mb-4">
          Renew / Buy Credits
        </h1>

        <Card className="border-black/10 max-w-xl">
          <CardHeader>
            <CardTitle className="text-base text-[#1F2A35]">
              Mint Credits
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-sm text-[#1F2A35]">
              <b>Current credits:</b>{' '}
              {credits === null ? '—' : credits}
            </div>

            <div className="text-sm text-[#1F2A35]/80">
              Each credit allows you to mint <b>one firearm</b>.
            </div>

            <div className="rounded-md bg-[#F7F6F2] border border-black/10 p-3 text-sm">
              To renew credits, contact administration or finance.
            </div>

            <div className="text-xs text-[#1F2A35]/60">
              Account email: {email || '—'}
            </div>

            <Button
              disabled
              className="w-full text-white opacity-60"
              style={{ backgroundColor: '#2F4F6F' }}
            >
              Awaiting Admin Top-Up
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
