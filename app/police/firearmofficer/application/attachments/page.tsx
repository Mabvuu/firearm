// app/police/firearmofficer/application/attachments/page.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import NavPage from '../../nav/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

type Application = {
  id: number
  applicant_name: string
  attachments: string[] | null
}

const BUCKET = 'applications'

const ACCEPTED_MIME = new Set<string>([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

const ACCEPT_ATTR = '.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.heic,.heif'

function ApplicationAttachmentsPageInner() {
  const searchParams = useSearchParams()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!appId) return

    const loadApp = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, attachments')
        .eq('id', appId)
        .single()

      if (error) {
        alert(error.message)
        return
      }

      setApp(data as Application)
    }

    loadApp()
  }, [appId])

  const validateFile = (file: File) => {
    const name = file.name.toLowerCase()
    const extOk =
      name.endsWith('.doc') ||
      name.endsWith('.docx') ||
      name.endsWith('.xls') ||
      name.endsWith('.xlsx') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.webp') ||
      name.endsWith('.heic') ||
      name.endsWith('.heif')

    const mimeOk = file.type ? ACCEPTED_MIME.has(file.type) : extOk

    if (!mimeOk) {
      alert('Only Word, Excel, and image files are allowed.')
      return false
    }

    return true
  }

  const uploadFile = async (file: File) => {
    if (!app) return
    if (!validateFile(file)) return

    setUploading(true)

    const safeName = file.name.replace(/[^\w.\-() ]+/g, '_')
    const path = `${app.id}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    })

    if (uploadErr) {
      alert(uploadErr.message)
      setUploading(false)
      return
    }

    const updatedAttachments = [...(app.attachments ?? []), path]

    const { error: dbErr } = await supabase
      .from('applications')
      .update({ attachments: updatedAttachments })
      .eq('id', app.id)

    if (dbErr) {
      alert(dbErr.message)
      setUploading(false)
      return
    }

    setApp({ ...app, attachments: updatedAttachments })
    setUploading(false)
  }

  const getFileUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

  if (!app)
    return (
      <div className="p-8" style={{ backgroundColor: COLORS.snowWhite, color: COLORS.blackBlue }}>
        Loading…
      </div>
    )

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.snowWhite }}>
      <div className="w-1/4 min-w-[260px] border-r" style={{ borderColor: COLORS.naturalAluminum }}>
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
              Attachments
            </h1>
            <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
              {app.applicant_name} (#{app.id})
            </p>
          </div>

          <Button
            asChild
            variant="outline"
            className="h-10"
            style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
          >
            <Link href="/police/firearmofficer/application">Back</Link>
          </Button>
        </div>

        <Card style={{ borderColor: COLORS.naturalAluminum }}>
          <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
            <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
              Upload & Review Files
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div
              className="rounded-md border p-4"
              style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
            >
              <div className="text-sm font-semibold mb-2" style={{ color: COLORS.blackBlue }}>
                Upload
              </div>

              <input
                type="file"
                accept={ACCEPT_ATTR}
                disabled={uploading}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) uploadFile(file)
                  e.currentTarget.value = ''
                }}
                className="text-sm"
              />

              <div className="mt-2 text-xs" style={{ color: COLORS.coolGreyMedium }}>
                Allowed: Word (.doc/.docx), Excel (.xls/.xlsx), Images (.jpg/.png/.webp/.heic)
              </div>
              <div className="mt-1 text-xs" style={{ color: COLORS.coolGreyMedium }}>
                {uploading ? 'Uploading…' : 'Files are saved in the "applications" bucket.'}
              </div>
            </div>

            <div
              className="rounded-md border p-4"
              style={{ borderColor: COLORS.naturalAluminum, backgroundColor: COLORS.snowWhite }}
            >
              <div className="text-sm font-semibold mb-2" style={{ color: COLORS.blackBlue }}>
                Current Attachments
              </div>

              {app.attachments?.length ? (
                <ul className="space-y-2 text-sm">
                  {app.attachments.map(a => (
                    <li key={a} className="flex items-center justify-between gap-3">
                      <a
                        href={getFileUrl(a)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                        style={{ color: COLORS.blackBlue }}
                      >
                        {a.split('/').pop()}
                      </a>
                      <span className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
                        stored
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                  No attachments uploaded.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                asChild
                className="h-11 text-base"
                style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
              >
                <Link href={`/police/firearmofficer/application/competency?appId=${app.id}`}>Next</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ApplicationAttachmentsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <ApplicationAttachmentsPageInner />
    </Suspense>
  )
}
