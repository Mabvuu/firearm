// components/TrackFloater.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AppRow = {
  application_uid: string
  created_at: string
}

export default function TrackFloater({
  trackRouteBase = '/dealer/audit/track',
  placeholder = 'Enter National ID (Applicant ID)',
}: {
  trackRouteBase?: string
  placeholder?: string
}) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const go = async () => {
    const nationalId = value.trim()
    if (!nationalId) return setErr('Enter National ID')

    setBusy(true)
    setErr(null)

    // make sure session exists
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      setBusy(false)
      setErr('Not logged in')
      return
    }

    // ✅ Search newest application by national_id ONLY (RLS will restrict access)
    const { data, error } = await supabase
      .from('applications')
      .select('application_uid, created_at')
      .eq('national_id', nationalId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error(error)
      setBusy(false)
      setErr(error.message || 'Failed to search')
      return
    }

    const row = (data?.[0] ?? null) as AppRow | null
    if (!row?.application_uid) {
      setBusy(false)
      setErr('No application found for that National ID')
      return
    }

    setBusy(false)
    setOpen(false)
    setValue('')
    setErr(null)

    router.push(`${trackRouteBase}/${encodeURIComponent(row.application_uid)}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setErr(null)
          setValue('')
        }}
        className="fixed bottom-6 right-6 z-50 rounded-full px-5 py-3 text-white shadow-lg"
        style={{ backgroundColor: '#2F4F6F' }}
      >
        Track
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => (!busy ? setOpen(false) : null)} />

          <div className="absolute bottom-20 right-6 w-[360px] max-w-[90vw] rounded-xl border border-black/10 bg-white shadow-xl">
            <div className="p-4 border-b border-black/10">
              <div className="text-base font-semibold text-[#1F2A35]">Track an application</div>
              <div className="text-xs text-muted-foreground">Search by National ID.</div>
            </div>

            <div className="p-4 space-y-3">
              <Input
                placeholder={placeholder}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void go()
                  if (e.key === 'Escape' && !busy) setOpen(false)
                }}
                disabled={busy}
              />

              {err ? <div className="text-xs text-red-600">{err}</div> : null}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  className="text-white"
                  style={{ backgroundColor: '#2F4F6F' }}
                  onClick={() => void go()}
                  disabled={busy}
                >
                  {busy ? 'Searching…' : 'Track'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
