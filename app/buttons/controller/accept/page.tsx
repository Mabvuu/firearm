// app/buttons/controller/accept/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type Props = {
  applicationId: number
  disabled?: boolean
  label?: string
  onSuccess?: (walletId?: string) => void
  onError?: (message: string) => void
}

type DecisionResponse = { ok?: boolean; error?: string; walletId?: string }

export default function AcceptTransferButton({
  applicationId,
  disabled = false,
  label = 'Accept & Transfer Ownership',
  onSuccess,
  onError,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    try {
      setLoading(true)

      // approves + transfers ownership (DB + on-chain) + returns walletId
      const res = await fetch('/api/joc/controller/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', applicationId, transferOwnership: true }),
      })

      const data = (await res.json().catch(() => ({}))) as DecisionResponse

      if (!res.ok || data?.ok === false) {
        const msg = data?.error || 'Approve failed'
        onError?.(msg)
        return
      }

      onSuccess?.(data.walletId)

      const walletId = (data.walletId ?? '').trim()
      if (walletId) {
        router.push(`/joc/controller/wallet?walletId=${encodeURIComponent(walletId)}`)
      } else {
        // fallback refresh if no wallet page
        router.refresh()
      }
    } catch (e) {
      console.error(e)
      onError?.('Approve failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button disabled={disabled || loading} onClick={() => void handleClick()}>
      {loading ? 'Working…' : label}
    </Button>
  )
}
