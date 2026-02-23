// components/DeclineButton.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

type Props = {
  applicationId: number
  stage: string
  disabled?: boolean
  onSuccess?: () => void
}

type ApiRes = { ok?: boolean; error?: string; warning?: string }

export default function DeclineButton({ applicationId, stage, disabled, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    const r = reason.trim()
    if (!r) return setErr('Reason is required')

    setBusy(true)
    setErr(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const token = session?.access_token
      if (!token) {
        setErr('Not logged in')
        setBusy(false)
        return
      }

      const res = await fetch('/api/applications/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicationId,
          stage,
          reason: r,
        }),
      })

      const data: ApiRes = await res.json().catch(() => ({}))
      if (!res.ok || data?.ok === false) {
        setErr(data?.error || 'Decline failed')
        setBusy(false)
        return
      }

      setBusy(false)
      setOpen(false)
      setReason('')
      setErr(null)
      onSuccess?.()
    } catch (e) {
      console.error(e)
      setErr('Decline failed')
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        disabled={!!disabled}
        onClick={() => {
          setOpen(true)
          setErr(null)
          setReason('')
        }}
      >
        Decline
      </Button>

      <Dialog open={open} onOpenChange={(v) => (!busy ? setOpen(v) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline application</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Reason (required)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Write the reason…"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
                if (e.key === 'Escape' && !busy) setOpen(false)
              }}
            />
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void submit()} disabled={busy}>
              {busy ? 'Declining…' : 'Confirm decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
