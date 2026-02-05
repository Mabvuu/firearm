// app/dealer/application/page.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import TrackFloater from '@/components/TrackFloater'

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

type Step = 1 | 2 | 3 | 4

const PROVINCES = [
  'Bulawayo',
  'Harare',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands',
] as const

const DISTRICTS: Record<(typeof PROVINCES)[number], string[]> = {
  Bulawayo: ['Bulawayo'],
  Harare: ['Harare', 'Chitungwiza', 'Epworth'],
  Manicaland: ['Buhera', 'Chimanimani', 'Chipinge', 'Makoni', 'Mutare', 'Mutasa', 'Nyanga'],
  'Mashonaland Central': [
    'Bindura',
    'Guruve',
    'Mazowe',
    'Mbire',
    'Mount Darwin',
    'Muzarabani',
    'Rushinga',
    'Shamva',
  ],
  'Mashonaland East': [
    'Chikomba',
    'Goromonzi',
    'Marondera',
    'Mudzi',
    'Murehwa',
    'Mutoko',
    'Seke',
    'Uzumba-Maramba-Pfungwe',
    'Wedza (Hwedza)',
  ],
  'Mashonaland West': ['Chegutu', 'Hurungwe', 'Kariba', 'Makonde', 'Mhondoro-Ngezi', 'Sanyati', 'Zvimba'],
  Masvingo: ['Bikita', 'Chiredzi', 'Chivi', 'Gutu', 'Masvingo', 'Mwenezi', 'Zaka'],
  'Matabeleland North': ['Binga', 'Bubi', 'Hwange', 'Lupane', 'Nkayi', 'Tsholotsho', 'Umguza'],
  'Matabeleland South': ['Beitbridge', 'Bulilima', 'Gwanda', 'Insiza', 'Mangwe', 'Matobo', 'Umzingwane'],
  Midlands: ['Chirumhanzu', 'Gokwe North', 'Gokwe South', 'Gweru', 'Kwekwe', 'Mberengwa', 'Shurugwi', 'Zvishavane'],
}

const selectClass =
  'h-10 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10'

export default function DealerApplicationPage() {
  const [step, setStep] = useState<Step>(1)

  const [form, setForm] = useState({
    applicant_name: '',
    national_id: '',
    address: '',
    phone: '',
    province: '' as '' | (typeof PROVINCES)[number],
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

  const resetAll = () => {
    setStep(1)
    setStarted(false)
    setCreatedUid(null)
    setSubmitting(false)
    setFiles([])
    setShowGunPicker(false)
    setGunQuery('')
    setShowOfficerPicker(false)
    setOfficerQuery('')
    setForm({
      applicant_name: '',
      national_id: '',
      address: '',
      phone: '',
      province: '',
      district: '',
      gun_uid: null,
      officer_email: '',
    })
  }

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
    return guns.filter(g => `${g.make} ${g.model} ${g.serial ?? ''}`.toLowerCase().includes(q))
  }, [guns, gunQuery])

  const filteredOfficers = useMemo(() => {
    const q = officerQuery.toLowerCase()
    return officers.filter(o => o.email.toLowerCase().includes(q))
  }, [officers, officerQuery])

  const canNextFromStep1 = () =>
    !!form.applicant_name.trim() &&
    !!form.national_id.trim() &&
    !!form.address.trim() &&
    !!form.phone.trim() &&
    !!form.province &&
    !!form.district

  const canNextFromStep2 = () => !!form.gun_uid
  const canNextFromStep3 = () => !!form.officer_email

  const next = () => setStep(s => (s < 4 ? ((s + 1) as Step) : s))
  const back = () => setStep(s => (s > 1 ? ((s - 1) as Step) : s))

  const submitApplication = async () => {
    try {
      setSubmitting(true)

      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession()

      const token = session?.access_token
      const user = session?.user

      if (sessErr || !token || !user?.email) {
        alert('Not logged in')
        setSubmitting(false)
        return
      }

      if (!canNextFromStep1()) {
        alert('Fill in applicant info')
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicant_name: form.applicant_name,
          national_id: form.national_id,
          address: form.address,
          phone: form.phone,
          province: form.province,
          district: form.district,
          gun_uid: form.gun_uid,
          officer_email: form.officer_email,
          attachments: uploaded,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error(data)
        alert(data?.error || 'Application failed')
        setSubmitting(false)
        return
      }

      setCreatedUid(String(data.application_uid ?? ''))
      setStarted(true)
      setSubmitting(false)
    } catch (err) {
      console.error(err)
      alert('Unexpected error')
      setSubmitting(false)
    }
  }

  const districtsForProvince = form.province ? DISTRICTS[form.province] : []

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      <div className="w-1/4 border-r border-black/10">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="max-w-5xl space-y-6">
          {started && (
            <Alert className="border-black/10 bg-white">
              <AlertTitle className="text-[#1F2A35]">Application started</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Your application has started{createdUid ? ` (UID: ${createdUid})` : ''}.
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetAll}>
                    Start new one
                  </Button>

                  <Button asChild className="text-white" style={{ backgroundColor: '#2F4F6F' }}>
                    <Link
                      href={
                        createdUid
                          ? `/dealer/audit/track/${encodeURIComponent(createdUid)}`
                          : '/dealer/audit'
                      }
                    >
                      Track it
                    </Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1F2A35]">New Firearm Application</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Step {step} of 4 —{' '}
                {step === 1
                  ? 'Applicant info'
                  : step === 2
                    ? 'Select firearm'
                    : step === 3
                      ? 'Select officer'
                      : 'Send'}
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-black/10 bg-white">
              <CardHeader>
                <CardTitle className="text-[#1F2A35]">
                  {step === 1 && 'Applicant info'}
                  {step === 2 && 'Select firearm'}
                  {step === 3 && 'Select officer in charge'}
                  {step === 4 && 'Send application'}
                </CardTitle>

                <CardDescription>
                  {step === 1 && 'Fill in identity + location (Zimbabwe province/district).'}
                  {step === 2 && 'Pick a minted firearm from inventory.'}
                  {step === 3 && 'Choose the officer email to send to.'}
                  {step === 4 && 'Review then send.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {step === 1 && (
                  <>
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

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Province</div>
                        <select
                          className={selectClass}
                          value={form.province}
                          onChange={e => {
                            const province = e.target.value as typeof form.province
                            setForm({ ...form, province, district: '' })
                          }}
                        >
                          <option value="">Select province…</option>
                          {PROVINCES.map(p => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">District</div>
                        <select
                          className={selectClass}
                          value={form.district}
                          disabled={!form.province}
                          onChange={e => setForm({ ...form, district: e.target.value })}
                        >
                          <option value="">
                            {form.province ? 'Select district…' : 'Select province first…'}
                          </option>
                          {districtsForProvince.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
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
                  </>
                )}

                {step === 2 && (
                  <>
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
                  </>
                )}

                {step === 3 && (
                  <>
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
                  </>
                )}

                {step === 4 && (
                  <div className="space-y-3">
                    <div className="rounded-md border border-black/10 bg-[#F7F6F2] p-4 text-sm space-y-2">
                      <div>
                        <b>Applicant:</b> {form.applicant_name} ({form.national_id})
                      </div>
                      <div>
                        <b>Phone:</b> {form.phone}
                      </div>
                      <div>
                        <b>Address:</b> {form.address}
                      </div>
                      <div>
                        <b>Location:</b> {form.province} / {form.district}
                      </div>
                      <div>
                        <b>Firearm ID:</b> {form.gun_uid ?? '-'}
                      </div>
                      <div>
                        <b>Officer:</b> {form.officer_email || '-'}
                      </div>
                      <div>
                        <b>Attachments:</b> {files.length ? `${files.length} file(s)` : 'None'}
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={submitApplication}
                      disabled={submitting}
                      className="w-full text-white"
                      style={{ backgroundColor: '#2F4F6F' }}
                    >
                      {submitting ? 'Sending…' : 'Send'}
                    </Button>

                    <div className="text-xs text-muted-foreground">After sending, use “Track it” above.</div>
                  </div>
                )}

                {!started && (
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" onClick={back} disabled={step === 1 || submitting}>
                      Back
                    </Button>

                    {step < 4 && (
                      <Button
                        className="text-white"
                        style={{ backgroundColor: '#2F4F6F' }}
                        onClick={() => {
                          if (step === 1 && !canNextFromStep1())
                            return alert('Fill in all applicant fields + select province/district')
                          if (step === 2 && !canNextFromStep2()) return alert('Select a firearm')
                          if (step === 3 && !canNextFromStep3()) return alert('Select an officer')
                          next()
                        }}
                        disabled={submitting}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-black/10 bg-white">
                <CardHeader>
                  <CardTitle className="text-base text-[#1F2A35]">Status</CardTitle>
                  <CardDescription>What you’ve selected so far.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <b>Province:</b> {form.province || '-'}
                  </div>
                  <div>
                    <b>District:</b> {form.district || '-'}
                  </div>
                  <div>
                    <b>Firearm:</b> {form.gun_uid ?? '-'}
                  </div>
                  <div>
                    <b>Officer:</b> {form.officer_email || '-'}
                  </div>
                  <div>
                    <b>Files:</b> {files.length ? `${files.length}` : '0'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING TRACK BUTTON */}
     <TrackFloater trackRouteBase="/dealer/audit/track" />

    </div>
  )
}
