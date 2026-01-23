// app/cfr/propol/application/add-attachment/page.tsx
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
  propol_notes: string | null
  status: string
}

const toLabel = (raw: string) =>
  raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase())
    .trim()

const statusBadgeVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'approved_by_propol':
      return 'default'
    case 'sent_to_propol':
      return 'secondary'
    case 'propol_declined':
    case 'declined':
    case 'returned':
      return 'destructive'
    default:
      return 'outline'
  }
}

function PropolAddAttachmentPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) return

    const load = async () => {
      setErrorMsg(null)
      setSuccessMsg(null)

      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, attachments, propol_notes, status')
        .eq('id', appId)
        .single()

      if (error) {
        setErrorMsg(error.message)
        return
      }

      const a = data as Application
      setApp(a)
      setNotes(a.propol_notes ?? '')
    }

    load()
  }, [appId])

  const getFileUrl = (path: string) => {
    return supabase.storage.from('applications').getPublicUrl(path).data.publicUrl
  }

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
        const path = `applications/${app.id}/propol/${crypto.randomUUID()}-${safeName}`

        const { error: upErr } = await supabase.storage.from('applications').upload(path, file, {
          upsert: false,
        })

        if (upErr) throw new Error(upErr.message)

        uploaded.push(path)
      }

      const updated = [...(app.attachments ?? []), ...uploaded]

      const { error: dbErr } = await supabase.from('applications').update({ attachments: updated }).eq('id', app.id)

      if (dbErr) throw new Error(dbErr.message)

      setApp({ ...app, attachments: updated })
      setSuccessMsg(`Uploaded ${uploaded.length} file(s).`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const removeAttachment = async (path: string) => {
    if (!app) return

    setErrorMsg(null)
    setSuccessMsg(null)
    setUploading(true)

    try {
      const updated = (app.attachments ?? []).filter(a => a !== path)

      const { error: dbErr } = await supabase.from('applications').update({ attachments: updated }).eq('id', app.id)
      if (dbErr) throw new Error(dbErr.message)

      await supabase.storage.from('applications').remove([path])

      setApp({ ...app, attachments: updated })
      setSuccessMsg('Attachment removed.')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Remove failed.')
    } finally {
      setUploading(false)
    }
  }

  const saveNotes = async () => {
    if (!app) return
    setErrorMsg(null)
    setSuccessMsg(null)
    setSaving(true)

    const { error } = await supabase.from('applications').update({ propol_notes: notes }).eq('id', app.id)

    setSaving(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setApp({ ...app, propol_notes: notes })
    setSuccessMsg('Notes saved.')
  }

  const decline = async () => {
    if (!app) return
    setErrorMsg(null)
    setSuccessMsg(null)
    setActing(true)

    const { error } = await supabase.from('applications').update({ status: 'propol_declined' }).eq('id', app.id)

    setActing(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push('/cfr/propol/application')
  }

  const approveNext = async () => {
    if (!app) return
    setErrorMsg(null)
    setSuccessMsg(null)
    setActing(true)

    const { error } = await supabase.from('applications').update({ status: 'approved_by_propol' }).eq('id', app.id)

    setActing(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push(`/cfr/propol/application/approval?appId=${app.id}`)
  }

  if (!appId) {
    return (
      <div className="flex min-h-screen bg-muted/20">
        <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
          <NavPage />
        </aside>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-5xl p-6 lg:p-8">
            <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
              Missing appId in URL.
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="flex min-h-screen bg-muted/20">
        <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
          <NavPage />
        </aside>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-5xl p-6 lg:p-8">
            <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
              Loading…
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
        <NavPage />
      </aside>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Province Review</h1>
                <Badge variant={statusBadgeVariant(app.status)} className="capitalize">
                  {toLabel(app.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {app.applicant_name} — #{app.id}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/cfr/propol/application')}
                disabled={uploading || saving || acting}
              >
                Back to Inbox
              </Button>
              <Button onClick={approveNext} disabled={uploading || saving || acting}>
                {acting ? 'Working…' : 'Approve & Next'}
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
              <CardTitle className="text-base">Attachments & Notes</CardTitle>
              <Separator />
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-background p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold">Add attachments</div>
                    <div className="text-xs text-muted-foreground">
                      Upload supporting documents for this review.
                    </div>
                  </div>
                  <Badge variant="outline">{app.attachments?.length ?? 0} file(s)</Badge>
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filesOnly.map(a => (
                      <div key={a} className="flex items-start justify-between gap-3 rounded-md border p-3">
                        <div className="min-w-0">
                          <a
                            href={getFileUrl(a)}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {a.split('/').pop()}
                          </a>
                          <div className="truncate text-xs text-muted-foreground">{a}</div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(getFileUrl(a), '_blank')}
                            disabled={uploading || acting}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeAttachment(a)}
                            disabled={uploading || acting}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No attachments yet.</div>
                )}
              </div>

              <div className="rounded-lg border bg-background p-4 space-y-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">Province notes</div>
                  <div className="text-xs text-muted-foreground">Keep notes short and factual.</div>
                </div>

                <textarea
                  className="w-full min-h-[140px] rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Optional notes…"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  disabled={acting}
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Saved notes will appear in the full application view.
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={saveNotes} disabled={saving || acting}>
                      {saving ? 'Saving…' : 'Save Notes'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={decline}
                      disabled={uploading || saving || acting}
                    >
                      {acting ? 'Working…' : 'Decline'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => router.push('/cfr/propol/application')}
                  disabled={uploading || saving || acting}
                >
                  Back
                </Button>
                <Button onClick={approveNext} disabled={uploading || saving || acting}>
                  {acting ? 'Working…' : 'Approve & Next'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function PropolAddAttachmentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <PropolAddAttachmentPageInner />
    </Suspense>
  )
}
