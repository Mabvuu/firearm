// app/cfr/dispol/application/add-attachment/page.tsx
'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

type Application = {
  id: number
  applicant_name: string | null
  attachments: string[] | null
  dispol_notes: string | null
  status: string
}

const allowedExt = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'])

const getExt = (name: string) => {
  const p = name.split('.')
  if (p.length < 2) return ''
  return p[p.length - 1]!.toLowerCase()
}

function DispolAddAttachmentPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) return

    const load = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, attachments, dispol_notes, status')
        .eq('id', appId)
        .single()

      if (error) {
        setErrorMsg(error.message)
        return
      }

      const a = data as Application
      setApp(a)
      setNotes(a.dispol_notes ?? '')
    }

    load()
  }, [appId])

  const getFileUrl = (path: string) => {
    const bucket = path.startsWith('applications/') ? 'applications' : 'application-attachments'
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const filesUi = useMemo(() => {
    const list = app?.attachments ?? []
    return list.map(p => ({
      path: p,
      name: p.split('/').pop() || p,
    }))
  }, [app?.attachments])

  const uploadFiles = async (files: FileList) => {
    if (!app) return
    const list = Array.from(files)
    if (!list.length) return

    for (const f of list) {
      const ext = getExt(f.name)
      if (!allowedExt.has(ext)) {
        setErrorMsg(`File not allowed: ${f.name}. Allowed: PDF, Word, Excel, JPG/PNG.`)
        return
      }
    }

    setUploading(true)
    setErrorMsg(null)

    const uploaded: string[] = []

    for (const file of list) {
      const safeName = file.name.replace(/[^\w.\-() ]+/g, '_')
      const path = `${app.id}/dispol/${crypto.randomUUID()}-${safeName}`

      const { error: upErr } = await supabase.storage.from('applications').upload(path, file, {
        upsert: false,
      })

      if (upErr) {
        setUploading(false)
        setErrorMsg(upErr.message)
        return
      }

      uploaded.push(path)
    }

    const updated = [...(app.attachments ?? []), ...uploaded]

    const { error: dbErr } = await supabase.from('applications').update({ attachments: updated }).eq('id', app.id)

    setUploading(false)

    if (dbErr) {
      setErrorMsg(dbErr.message)
      return
    }

    setApp({ ...app, attachments: updated })
  }

  const saveNotes = async () => {
    if (!app) return
    setSaving(true)
    setErrorMsg(null)

    const { error } = await supabase.from('applications').update({ dispol_notes: notes }).eq('id', app.id)

    setSaving(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setApp({ ...app, dispol_notes: notes })
  }

  const decline = async () => {
    if (!app) return
    setActing(true)
    setErrorMsg(null)

    const { error } = await supabase.from('applications').update({ status: 'dispol_declined' }).eq('id', app.id)

    setActing(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push('/cfr/dispol/application')
  }

  const approve = async () => {
    if (!app) return
    setActing(true)
    setErrorMsg(null)

    const { error } = await supabase.from('applications').update({ status: 'approved_by_dispol' }).eq('id', app.id)

    setActing(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push(`/cfr/dispol/application/approval?appId=${app.id}`)
  }

  if (!appId) {
    return (
      <div className="p-8" style={{ backgroundColor: COLORS.snowWhite, color: COLORS.blackBlue }}>
        Missing appId in URL.
      </div>
    )
  }

  if (!app && !errorMsg) {
    return (
      <div className="p-8" style={{ backgroundColor: COLORS.snowWhite, color: COLORS.blackBlue }}>
        Loading…
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.snowWhite }}>
      <div
        className="w-1/4 min-w-[260px]"
        style={{ borderRight: `1px solid ${COLORS.naturalAluminum}` }}
      >
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
              District Review
            </h1>
            <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
              {app ? `${app.applicant_name ?? 'Applicant'} (#${app.id})` : '—'}
            </p>
          </div>

          <Button
            variant="outline"
            className="h-10"
            style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
            onClick={() => router.back()}
          >
            Back
          </Button>
        </div>

        <Card style={{ borderColor: COLORS.naturalAluminum }}>
          <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
            <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
              Attachments & Notes
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {errorMsg && (
              <div
                className="rounded-md border p-3 text-sm"
                style={{
                  borderColor: 'rgba(239,68,68,0.4)',
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  color: '#991b1b',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
              <div className="px-3 py-2 border-b" style={{ borderColor: COLORS.naturalAluminum }}>
                <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                  Upload files
                </div>
                <div className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                  Allowed: PDF, Word, Excel, JPG/PNG
                </div>
              </div>

              <div className="px-3 py-3">
                <Input
                  type="file"
                  multiple
                  disabled={uploading}
                  onChange={e => {
                    if (e.target.files) uploadFiles(e.target.files)
                    e.currentTarget.value = ''
                  }}
                />

                <div className="mt-2 text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                  {uploading ? 'Uploading…' : 'Choose one or more files.'}
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
              <div className="px-3 py-2 border-b" style={{ borderColor: COLORS.naturalAluminum }}>
                <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                  Attached files ({filesUi.length})
                </div>
              </div>

              {filesUi.length === 0 ? (
                <div className="px-3 py-3 text-sm" style={{ color: COLORS.coolGreyMedium }}>
                  No attachments yet.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
                  {filesUi.map(f => (
                    <div key={f.path} className="px-3 py-2 flex items-center justify-between gap-3">
                      <a
                        href={getFileUrl(f.path)}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate underline text-sm"
                        style={{ color: COLORS.blackBlue }}
                      >
                        {f.name}
                      </a>
                      <span className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                        view
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md border bg-white" style={{ borderColor: COLORS.naturalAluminum }}>
              <div className="px-3 py-2 border-b" style={{ borderColor: COLORS.naturalAluminum }}>
                <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                  Notes
                </div>
              </div>

              <div className="px-3 py-3 space-y-2">
                <textarea
                  className="w-full min-h-[120px] border rounded p-2 text-sm"
                  style={{ borderColor: COLORS.naturalAluminum }}
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={saveNotes}
                    disabled={saving}
                    style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
                  >
                    {saving ? 'Saving…' : 'Save Notes'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="destructive" onClick={decline} disabled={acting}>
                {acting ? 'Working…' : 'Decline'}
              </Button>

              <Button
                onClick={approve}
                disabled={acting}
                style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
              >
                {acting ? 'Working…' : 'Approve & Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DispolAddAttachmentPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <DispolAddAttachmentPageInner />
    </Suspense>
  )
}
