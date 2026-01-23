// app/joc/mid/application/add-notes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Application = {
  id: number
  applicant_name: string
  joc_mid_notes: string | null
}

export default function JOCMIDAddNotesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!appId) return

    const load = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, joc_mid_notes')
        .eq('id', appId)
        .single()

      if (error) {
        alert(error.message)
        return
      }

      setApp(data as Application)
      setNotes(data?.joc_mid_notes ?? '')
    }

    load()
  }, [appId])

  const saveAndNext = async () => {
    if (!app) return
    setSaving(true)

    const { error } = await supabase
      .from('applications')
      .update({ joc_mid_notes: notes })
      .eq('id', app.id)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push(`/joc/mid/application/approval?appId=${app.id}`)
  }

  if (!app) return <div className="p-8">Loading…</div>

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <Card>
          <CardHeader>
            <CardTitle>
              JOC MID Notes — {app.applicant_name} (#{app.id})
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="border rounded p-3 space-y-2">
              <div className="font-semibold">MID Notes</div>

              <textarea
                className="w-full min-h-[140px] border rounded p-2 text-sm pointer-events-auto"
                placeholder="Write MID notes here..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={saveAndNext} disabled={saving}>
                {saving ? 'Saving…' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
