'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Application = {
  id: number
  applicant_name: string
  attachments: string[] | null
  cfr_notes: string | null
  status: string
}

export default function CFRAddAttachmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!appId) return

    const load = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, attachments, cfr_notes, status')
        .eq('id', appId)
        .single()

      if (error) {
        alert(error.message)
        return
      }

      const a = data as Application
      setApp(a)
      setNotes(a.cfr_notes ?? '')
    }

    load()
  }, [appId])

  const getFileUrl = (path: string) => {
    const bucket = path.startsWith('applications/')
      ? 'applications'
      : 'application-attachments'
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const uploadFiles = async (files: FileList) => {
    if (!app) return
    const list = Array.from(files)
    if (!list.length) return

    setUploading(true)

    const uploaded: string[] = []

    for (const file of list) {
      const path = `${app.id}/cfr/${crypto.randomUUID()}-${file.name}`

      const { error: upErr } = await supabase.storage
        .from('application-attachments')
        .upload(path, file, { upsert: false })

      if (upErr) {
        alert(upErr.message)
        setUploading(false)
        return
      }

      uploaded.push(path)
    }

    const updated = [...(app.attachments ?? []), ...uploaded]

    const { error: dbErr } = await supabase
      .from('applications')
      .update({ attachments: updated })
      .eq('id', app.id)

    setUploading(false)

    if (dbErr) {
      alert(dbErr.message)
      return
    }

    setApp({ ...app, attachments: updated })
  }

  const saveNotes = async () => {
    if (!app) return
    setSaving(true)

    const { error } = await supabase
      .from('applications')
      .update({ cfr_notes: notes })
      .eq('id', app.id)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setApp({ ...app, cfr_notes: notes })
  }

  const decline = async () => {
    if (!app) return
    setActing(true)

    const { error } = await supabase
      .from('applications')
      .update({ status: 'cfr_declined' })
      .eq('id', app.id)

    setActing(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push('/cfr/cfr/application')
  }

  const approve = async () => {
    if (!app) return
    setActing(true)

    const { error } = await supabase
      .from('applications')
      .update({ status: 'approved_by_cfr' })
      .eq('id', app.id)

    setActing(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push(`/cfr/cfr/application/district?appId=${app.id}`)
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
              CFR Review — {app.applicant_name} (#{app.id})
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Upload */}
            <div className="border rounded p-3 space-y-2">
              <div className="font-semibold">Add Attachments</div>

              <Input
                type="file"
                multiple
                disabled={uploading}
                onChange={e => {
                  if (e.target.files) uploadFiles(e.target.files)
                  e.currentTarget.value = ''
                }}
              />

              {app.attachments?.length ? (
                <ul className="text-sm list-disc ml-5">
                  {app.attachments.map(a => (
                    <li key={a}>
                      <a
                        href={getFileUrl(a)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {a.split('/').pop()}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No attachments yet</div>
              )}
            </div>

            {/* Notes */}
            <div className="border rounded p-3 space-y-2">
              <div className="font-semibold">Notes</div>
              <textarea
                className="w-full min-h-[120px] border rounded p-2 text-sm"
                placeholder="Optional notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />

              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={saveNotes} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Notes'}
                </Button>
              </div>
            </div>

            {/* Approve / Decline */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="destructive" onClick={decline} disabled={acting}>
                {acting ? 'Working…' : 'Decline'}
              </Button>

              <Button onClick={approve} disabled={acting}>
                {acting ? 'Working…' : 'Approve'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
