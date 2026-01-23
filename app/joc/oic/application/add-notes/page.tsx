// app/joc/oic/application/add-notes/page.tsx
'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type Application = {
  id: number
  applicant_name: string
  attachments: string[] | null
  joc_oic_notes: string | null
  status: string
}

function JOCOICAddNotesPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const appIdRaw = searchParams.get('appId')
  const appId = Number(appIdRaw)
  const missingAppId = !appIdRaw || Number.isNaN(appId) || appId <= 0

  const [app, setApp] = useState<Application | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (missingAppId) return

    const load = async () => {
      setErrorMsg(null)
      setSuccessMsg(null)

      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, attachments, joc_oic_notes, status')
        .eq('id', appId)
        .single()

      if (error) {
        setErrorMsg(error.message)
        return
      }

      const a = data as Application
      setApp(a)
      setNotes(a.joc_oic_notes ?? '')
    }

    load()
  }, [appId, missingAppId])

  const getFileUrl = (path: string) =>
    supabase.storage.from('applications').getPublicUrl(path).data.publicUrl

  const filesOnly = useMemo(() => {
    const list = app?.attachments ?? []
    return [...list].reverse()
  }, [app?.attachments])

  const uploadFiles = async (files: FileList) => {
    if (!app) return
    const list = Array.from(files)
    if (!list.length) return

    setErrorMsg(null)
    setSuccessMsg(null)
    setUploading(true)

    const uploaded: string[] = []

    try {
      for (const file of list) {
        const safeName = file.name.replace(/[^\w.\- ]+/g, '_')
        const path = `applications/${app.id}/joc-oic/${crypto.randomUUID()}-${safeName}`

        const { error } = await supabase.storage.from('applications').upload(path, file, {
          upsert: false,
        })

        if (error) throw new Error(error.message)

        uploaded.push(path)
      }

      const updated = [...(app.attachments ?? []), ...uploaded]

      const { error } = await supabase.from('applications').update({ attachments: updated }).eq('id', app.id)

      if (error) throw new Error(error.message)

      setApp({ ...app, attachments: updated })
      setSuccessMsg(`Uploaded ${uploaded.length} file(s).`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const saveNotes = async () => {
    if (!app) return
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const { error } = await supabase.from('applications').update({ joc_oic_notes: notes }).eq('id', app.id)

    setSaving(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setApp({ ...app, joc_oic_notes: notes })
    setSuccessMsg('Notes saved.')
  }

  const decline = async () => {
    if (!app) return
    setActing(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const { error } = await supabase.from('applications').update({ status: 'joc_oic_declined' }).eq('id', app.id)

    setActing(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push('/joc/oic/application')
  }

  const approveDone = async () => {
    if (!app) return
    setActing(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const { error } = await supabase.from('applications').update({ status: 'approved_by_joc_oic' }).eq('id', app.id)

    setActing(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push(`/joc/oic/application/approval?appId=${app.id}`)
  }

  if (missingAppId) return <div className="p-8">Missing appId</div>
  if (!app) return <div className="p-8">Loading…</div>

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
        <NavPage />
      </aside>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-semibold tracking-tight">Review Application</h1>
                <Badge variant="outline">JOC Officer In Charge</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {app.applicant_name} — #{app.id}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/joc/oic/application')}
                disabled={uploading || saving || acting}
              >
                Back
              </Button>
              <Button onClick={approveDone} disabled={uploading || saving || acting}>
                {acting ? 'Working…' : 'Approve & Continue'}
              </Button>
            </div>
          </div>

          {(errorMsg || successMsg) && (
            <Alert variant={errorMsg ? 'destructive' : 'default'}>
              <AlertTitle>{errorMsg ? 'Error' : 'Done'}</AlertTitle>
              <AlertDescription>{errorMsg ?? successMsg}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Attachments & Notes</CardTitle>
                <Badge variant="secondary">{filesOnly.length} file(s)</Badge>
              </div>
              <Separator />
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Add attachments</div>
                  <Badge variant="outline">{filesOnly.length}</Badge>
                </div>

                <Input
                  type="file"
                  multiple
                  disabled={uploading || acting}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files) uploadFiles(e.target.files)
                    e.currentTarget.value = ''
                  }}
                />

                {filesOnly.length ? (
                  <ul className="text-sm list-disc ml-5 space-y-1">
                    {filesOnly.map(a => (
                      <li key={a}>
                        <a
                          href={getFileUrl(a)}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2"
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

              <div className="rounded-lg border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Notes</div>
                  <Badge variant="outline">Optional</Badge>
                </div>

                <textarea
                  className="w-full min-h-[180px] rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Write a clear note (facts only)…"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  disabled={acting}
                />

                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={saveNotes} disabled={saving || acting}>
                    {saving ? 'Saving…' : 'Save Notes'}
                  </Button>

                  <Button size="sm" variant="destructive" onClick={decline} disabled={acting}>
                    {acting ? 'Working…' : 'Decline'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Approve will move you to the next step to assign JOC MID.
              </div>
            </CardContent>
          </Card>

          <div className="md:hidden rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            Tip: Use a wider screen to see the sidebar navigation.
          </div>
        </div>
      </main>
    </div>
  )
}

export default function JOCOICAddNotesPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <JOCOICAddNotesPageInner />
    </Suspense>
  )
}
