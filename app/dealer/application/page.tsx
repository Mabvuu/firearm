// app/dealer/application/page.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type Gun = {
  id: number
  make: string
  model: string
  caliber: string | null
  serial: string | null
}

export default function DealerApplicationPage() {
  const [form, setForm] = useState({
    applicant_name: '',
    national_id: '',
    address: '',
    phone: '',
    province: '',
    district: '',
    gun_uid: null as number | null,
    officer_email: '',
  })

  const [files, setFiles] = useState<File[]>([])

  const [guns, setGuns] = useState<Gun[]>([])
  const [showGunPicker, setShowGunPicker] = useState(false)
  const [gunQuery, setGunQuery] = useState('')

  const [officers, setOfficers] = useState<{ email: string }[]>([])
  const [showOfficerPicker, setShowOfficerPicker] = useState(false)
  const [officerQuery, setOfficerQuery] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [started, setStarted] = useState(false)
  const [createdUid, setCreatedUid] = useState<string | null>(null)

  const loadMintedGuns = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, make, model, caliber, serial')
      .eq('minted', true)

    if (error) {
      console.error(error)
      alert('Failed to load firearms')
      return
    }

    setGuns(data || [])
  }

  const loadOfficers = async () => {
    const res = await fetch('/api/firearm-officers')
    const data = await res.json()
    setOfficers(data || [])
  }

  const filteredGuns = useMemo(() => {
    const q = gunQuery.toLowerCase()
    return guns.filter(g =>
      `${g.make} ${g.model} ${g.serial ?? ''}`.toLowerCase().includes(q)
    )
  }, [guns, gunQuery])

  const filteredOfficers = useMemo(() => {
    const q = officerQuery.toLowerCase()
    return officers.filter(o => o.email.toLowerCase().includes(q))
  }, [officers, officerQuery])

  const submitApplication = async () => {
    try {
      setSubmitting(true)

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user?.email) {
        alert('Not logged in')
        setSubmitting(false)
        return
      }

      if (!form.gun_uid) {
        alert('Select a firearm')
        setSubmitting(false)
        return
      }

      if (!form.officer_email) {
        alert('Select an officer')
        setSubmitting(false)
        return
      }

      const uploaded: string[] = []

      for (const file of files) {
        const path = `applications/${user.email}/${crypto.randomUUID()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('applications').upload(path, file)

        if (upErr) {
          console.error(upErr)
          alert('File upload failed')
          setSubmitting(false)
          return
        }

        uploaded.push(path)
      }

      const res = await fetch('/api/dealer/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          ...form,
          attachments: uploaded,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error(data)
        alert('Application failed')
        setSubmitting(false)
        return
      }

      // ✅ notification + CTA to audit
      setCreatedUid(String(data.application_uid ?? ''))
      setStarted(true)
      setSubmitting(false)
    } catch (err) {
      console.error(err)
      alert('Unexpected error')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4 border-r border-black/10">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="max-w-5xl space-y-6">
          {/* TOP NOTICE */}
          {started && (
            <Alert className="border-black/10 bg-white">
              <AlertTitle className="text-[#1F2A35]">Application started</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Your application has been created{createdUid ? ` (UID: ${createdUid})` : ''}.
                  It is now in the system.
                </div>

                <Button asChild className="text-white" style={{ backgroundColor: '#2F4F6F' }}>
                  <Link href="/dealer/audit">Start Application</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* HEADER */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1F2A35]">New Firearm Application</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill in details, attach firearm + documents, then submit.
              </p>
            </div>

            <Badge
              className="border"
              style={{
                backgroundColor: '#E6E5E2',
                borderColor: '#B5B5B366',
                color: '#1F2A35',
              }}
            >
              Dealer
            </Badge>
          </div>

          <Separator />

          {/* LAYOUT */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* FORM */}
            <Card className="lg:col-span-2 border-black/10 bg-white">
              <CardHeader>
                <CardTitle className="text-[#1F2A35]">Applicant info</CardTitle>
                <CardDescription>Basic identity and contact details.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Full name"
                    value={form.applicant_name}
                    onChange={e => setForm({ ...form, applicant_name: e.target.value })}
                  />
                  <Input
                    placeholder="National ID"
                    value={form.national_id}
                    onChange={e => setForm({ ...form, national_id: e.target.value })}
                  />
                  <Input
                    placeholder="Address"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                  <Input
                    placeholder="Phone"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Province"
                    value={form.province}
                    onChange={e => setForm({ ...form, province: e.target.value })}
                  />
                  <Input
                    placeholder="District"
                    value={form.district}
                    onChange={e => setForm({ ...form, district: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-[#1F2A35]">Attachments</div>
                  <Input
  type="file"
  multiple
  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
  onChange={e => setFiles(Array.from(e.target.files || []))}
/>

                  <div className="text-xs text-muted-foreground">
                    {files.length ? `${files.length} file(s) selected` : 'PDF or images accepted.'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SIDE PICKERS */}
            <div className="space-y-6">
              {/* FIREARM PICKER */}
              <Card className="border-black/10 bg-white">
                <CardHeader>
                  <CardTitle className="text-base text-[#1F2A35]">Attach firearm</CardTitle>
                  <CardDescription>Only minted firearms appear.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    className="w-full text-white"
                    style={{ backgroundColor: '#2F4F6F' }}
                    onClick={() => {
                      setShowGunPicker(v => !v)
                      if (!guns.length) void loadMintedGuns()
                    }}
                  >
                    {form.gun_uid ? 'Change firearm' : 'Select firearm'}
                  </Button>

                  {form.gun_uid && (
                    <div className="rounded-md border border-black/10 bg-[#F7F6F2] p-3 text-sm">
                      Attached firearm ID: <b>{form.gun_uid}</b>
                    </div>
                  )}

                  {showGunPicker && (
                    <div className="rounded-md border border-black/10 bg-white p-3 space-y-2">
                      <Input
                        placeholder="Search firearm"
                        value={gunQuery}
                        onChange={e => setGunQuery(e.target.value)}
                      />

                      <div className="max-h-56 overflow-y-auto rounded border border-black/5">
                        {filteredGuns.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">No matches.</div>
                        ) : (
                          filteredGuns.map(g => (
                            <button
                              key={g.id}
                              type="button"
                              className="w-full text-left px-3 py-2 border-b border-black/5 hover:bg-black/5"
                              onClick={() => {
                                setForm({ ...form, gun_uid: g.id })
                                setShowGunPicker(false)
                              }}
                            >
                              <div className="text-sm font-medium text-[#1F2A35]">
                                {g.make} {g.model}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {g.serial ?? '-'} • {g.caliber ?? '-'} • ID {g.id}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* OFFICER PICKER */}
              <Card className="border-black/10 bg-white">
                <CardHeader>
                  <CardTitle className="text-base text-[#1F2A35]">Send to officer</CardTitle>
                  <CardDescription>Select firearm officer email.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setShowOfficerPicker(v => !v)
                      if (!officers.length) void loadOfficers()
                    }}
                  >
                    {form.officer_email ? 'Change officer' : 'Select officer'}
                  </Button>

                  {form.officer_email && (
                    <div className="rounded-md border border-black/10 bg-[#F7F6F2] p-3 text-sm">
                      Selected: <b>{form.officer_email}</b>
                    </div>
                  )}

                  {showOfficerPicker && (
                    <div className="rounded-md border border-black/10 bg-white p-3 space-y-2">
                      <Input
                        placeholder="Search officer email"
                        value={officerQuery}
                        onChange={e => setOfficerQuery(e.target.value)}
                      />

                      <div className="max-h-56 overflow-y-auto rounded border border-black/5">
                        {filteredOfficers.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">No matches.</div>
                        ) : (
                          filteredOfficers.map(o => (
                            <button
                              key={o.email}
                              type="button"
                              className="w-full text-left px-3 py-2 border-b border-black/5 hover:bg-black/5"
                              onClick={() => {
                                setForm({ ...form, officer_email: o.email })
                                setShowOfficerPicker(false)
                              }}
                            >
                              <div className="text-sm font-medium text-[#1F2A35]">{o.email}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SUBMIT */}
              <Card className="border-black/10 bg-white">
                <CardHeader>
                  <CardTitle className="text-base text-[#1F2A35]">Submit</CardTitle>
                  <CardDescription>Creates the application in the system.</CardDescription>
                </CardHeader>

                <CardContent>
                  <Button
                    type="button"
                    onClick={submitApplication}
                    disabled={submitting}
                    className="w-full text-white"
                    style={{ backgroundColor: '#2F4F6F' }}
                  >
                    {submitting ? 'Submitting…' : 'Submit Application'}
                  </Button>

                  <div className="mt-2 text-xs text-muted-foreground">
                    After submit, use “Start Application” to view it in Audit.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
