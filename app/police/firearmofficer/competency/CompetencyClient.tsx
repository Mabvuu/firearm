// app/police/firearmofficer/competency/CompetencyClient.tsx
'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

type Competency = {
  id: number
  user_id: string
  full_name: string
  national_id: string

  violent_crime_history: boolean
  violent_crime_details: string | null

  restraining_orders: boolean
  restraining_order_details: string | null

  mental_instability: boolean
  mental_instability_details: string | null

  substance_abuse: boolean
  substance_abuse_details: string | null

  firearms_training: boolean
  firearms_training_details: string | null

  threat_to_self_or_others: boolean
  threat_details: string | null

  notes: string | null
}

export default function CompetencyClient({ initialData }: { initialData: Competency[] }) {
  const [records, setRecords] = useState<Competency[]>(Array.isArray(initialData) ? initialData : [])
  const [query, setQuery] = useState('')

  const [openAdd, setOpenAdd] = useState(false)
  const [openView, setOpenView] = useState(false)
  const [selected, setSelected] = useState<Competency | null>(null)

  const [refreshing, setRefreshing] = useState(false)

  const sorted = useMemo(() => [...records].sort((a, b) => b.id - a.id), [records])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(r =>
      `${r.full_name} ${r.national_id} ${r.id}`.toLowerCase().includes(q)
    )
  }, [sorted, query])

  const refresh = async () => {
    setRefreshing(true)
    const { data, error } = await supabase
      .from('competency')
      .select('*')
      .order('created_at', { ascending: false })

    setRefreshing(false)

    if (error) {
      alert(error.message)
      return
    }
    setRecords((data as Competency[]) ?? [])
  }

  const openDetails = (r: Competency) => {
    setSelected(r)
    setOpenView(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
            Competency Assessments
          </h1>
          <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
            Search, open, and review records.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-11"
            style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
            onClick={refresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>

          <Button
            className="h-11 text-base"
            style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
            onClick={() => setOpenAdd(true)}
          >
            Add Assessment
          </Button>
        </div>
      </div>

      {/* Search + count */}
      <Card style={{ borderColor: COLORS.naturalAluminum }}>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by name / national id / record id"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                style={{
                  borderColor: COLORS.naturalAluminum,
                  color: COLORS.blackBlue,
                  backgroundColor: COLORS.snowWhite,
                }}
              >
                {filtered.length} record{filtered.length === 1 ? '' : 's'}
              </Badge>

              {query.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
                  onClick={() => setQuery('')}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card style={{ borderColor: COLORS.naturalAluminum }}>
        <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
          <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
            Records
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div
              className="rounded-md border p-4 text-sm"
              style={{ borderColor: COLORS.naturalAluminum, color: COLORS.coolGreyMedium }}
            >
              No assessments found.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r, idx) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openDetails(r)}
                  className="w-full text-left rounded-md border px-4 py-3 transition hover:bg-muted"
                  style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold truncate" style={{ color: COLORS.blackBlue }}>
                        {idx + 1}. {r.full_name}
                      </div>
                      <div className="text-xs" style={{ color: COLORS.lamar }}>
                        National ID: {r.national_id}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      style={{
                        borderColor: COLORS.naturalAluminum,
                        color: COLORS.blackBlue,
                        backgroundColor: COLORS.snowWhite,
                      }}
                    >
                      #{r.id}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIEW DETAILS */}
      <Dialog
        open={openView}
        onOpenChange={v => {
          setOpenView(v)
          if (!v) setSelected(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Competency Details</DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="text-sm text-muted-foreground">No record selected.</div>
          ) : (
            <div className="space-y-3">
              <div
                className="rounded-md border p-4"
                style={{ borderColor: COLORS.naturalAluminum, backgroundColor: COLORS.snowWhite }}
              >
                <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                  Applicant
                </div>
                <div className="text-lg font-semibold" style={{ color: COLORS.blackBlue }}>
                  {selected.full_name}
                </div>
                <div className="text-sm" style={{ color: COLORS.lamar }}>
                  National ID: {selected.national_id}
                </div>
                <div className="text-xs mt-1" style={{ color: COLORS.coolGreyMedium }}>
                  Record #{selected.id}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DetailRow n={1} label="Violent Crime History" yesNo={selected.violent_crime_history} details={selected.violent_crime_details} />
                <DetailRow n={2} label="Restraining Orders" yesNo={selected.restraining_orders} details={selected.restraining_order_details} />
                <DetailRow n={3} label="Mental Instability" yesNo={selected.mental_instability} details={selected.mental_instability_details} />
                <DetailRow n={4} label="Substance Abuse" yesNo={selected.substance_abuse} details={selected.substance_abuse_details} />
                <DetailRow n={5} label="Firearm Training" yesNo={selected.firearms_training} details={selected.firearms_training_details} />
                <DetailRow n={6} label="Threat to Self/Others" yesNo={selected.threat_to_self_or_others} details={selected.threat_details} />
              </div>

              <div
                className="rounded-md border p-4"
                style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
              >
                <div className="font-semibold" style={{ color: COLORS.blackBlue }}>
                  7. Officer Notes
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm" style={{ color: COLORS.blackBlue }}>
                  {selected.notes || '-'}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setOpenView(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD DIALOG */}
      <AddCompetencyDialog
        open={openAdd}
        onClose={async () => {
          setOpenAdd(false)
          await refresh()
        }}
      />
    </div>
  )
}

function DetailRow({
  n,
  label,
  yesNo,
  details,
}: {
  n: number
  label: string
  yesNo: boolean
  details: string | null
}) {
  return (
    <div
      className="rounded-md border p-4 space-y-2"
      style={{ borderColor: COLORS.naturalAluminum, backgroundColor: COLORS.snowWhite }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
            {n}. {label}
          </div>
          {yesNo && details ? (
            <div className="mt-1 text-xs" style={{ color: COLORS.coolGreyMedium }}>
              Details: {details}
            </div>
          ) : null}
        </div>

        <Badge
          variant={yesNo ? 'destructive' : 'outline'}
          style={
            yesNo
              ? { backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite, borderColor: COLORS.blackBlue }
              : { borderColor: COLORS.naturalAluminum, color: COLORS.blackBlue, backgroundColor: '#fff' }
          }
        >
          {yesNo ? 'Yes' : 'No'}
        </Badge>
      </div>

      {!yesNo ? (
        <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
          No
        </div>
      ) : null}
    </div>
  )
}

/* =============================
   ADD DIALOG (unchanged logic, slightly nicer spacing)
   ============================= */

function AddCompetencyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    full_name: '',
    national_id: '',

    violent_crime_history: false,
    violent_crime_details: '',

    restraining_orders: false,
    restraining_order_details: '',

    mental_instability: false,
    mental_instability_details: '',

    substance_abuse: false,
    substance_abuse_details: '',

    firearms_training: false,
    firearms_training_details: '',

    threat_to_self_or_others: false,
    threat_details: '',

    notes: '',
  })

  const submit = async () => {
    if (!form.national_id) return

    const { data: existing } = await supabase
      .from('competency')
      .select('id')
      .eq('national_id', form.national_id)
      .maybeSingle()

    if (existing) {
      alert('Competency already exists for this National ID')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('competency').insert({
      user_id: user.id,
      ...form,
    })

    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Firearm Competency Assessment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <input
            className="w-full border p-2 rounded"
            placeholder="Full legal name"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
          />

          <input
            className="w-full border p-2 rounded"
            placeholder="National ID (cannot be reused)"
            value={form.national_id}
            onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))}
          />

          <StructuredSection
            label="History of violent crime"
            checked={form.violent_crime_history}
            onToggle={() => setForm(f => ({ ...f, violent_crime_history: !f.violent_crime_history }))}
            onChange={v => setForm(f => ({ ...f, violent_crime_details: v }))}
            options={{
              type: ['Assault', 'Robbery', 'Domestic Violence', 'Attempted Murder', 'Other'],
              severity: ['Minor', 'Serious', 'Extreme'],
            }}
          />

          <StructuredSection
            label="Restraining orders"
            checked={form.restraining_orders}
            onToggle={() => setForm(f => ({ ...f, restraining_orders: !f.restraining_orders }))}
            onChange={v => setForm(f => ({ ...f, restraining_order_details: v }))}
            options={{
              type: ['Spouse', 'Ex-partner', 'Family member', 'Colleague', 'Other'],
              reason: ['Violence', 'Threats', 'Stalking', 'Harassment'],
            }}
          />

          <StructuredSection
            label="Mental instability"
            checked={form.mental_instability}
            onToggle={() => setForm(f => ({ ...f, mental_instability: !f.mental_instability }))}
            onChange={v => setForm(f => ({ ...f, mental_instability_details: v }))}
            options={{ type: ['Depression', 'Bipolar', 'Schizophrenia', 'PTSD'] }}
          />

          <StructuredSection
            label="Substance abuse"
            checked={form.substance_abuse}
            onToggle={() => setForm(f => ({ ...f, substance_abuse: !f.substance_abuse }))}
            onChange={v => setForm(f => ({ ...f, substance_abuse_details: v }))}
            options={{ type: ['Alcohol', 'Cannabis', 'Cocaine', 'Methamphetamine'] }}
          />

          <StructuredSection
            label="Firearm training"
            checked={form.firearms_training}
            onToggle={() => setForm(f => ({ ...f, firearms_training: !f.firearms_training }))}
            onChange={v => setForm(f => ({ ...f, firearms_training_details: v }))}
            options={{
              type: ['Police Academy', 'Certified Gun Club', 'Military', 'Private Instructor'],
              year: true,
            }}
          />

          <StructuredSection
            label="Threat to self or others"
            checked={form.threat_to_self_or_others}
            onToggle={() => setForm(f => ({ ...f, threat_to_self_or_others: !f.threat_to_self_or_others }))}
            onChange={v => setForm(f => ({ ...f, threat_details: v }))}
            options={{ type: ['Threat to Self', 'Threat to Family', 'Threat to Public'] }}
          />

          <textarea
            className="w-full border p-2 rounded"
            placeholder="Officer final risk assessment"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />

          <Button
            onClick={submit}
            className="h-11 text-base"
            style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
          >
            Save Assessment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StructuredSection({
  label,
  checked,
  onToggle,
  onChange,
  options,
}: {
  label: string
  checked: boolean
  onToggle: () => void
  onChange: (v: string) => void
  options: { type: string[]; severity?: string[]; reason?: string[]; year?: boolean }
}) {
  const [local, setLocal] = useState({
    type: '',
    severity: '',
    reason: '',
    year: '',
  })

  const handleChange = (key: keyof typeof local, value: string) => {
    const next = { ...local, [key]: value }
    setLocal(next)

    let combined = next.type
    if (options.severity && next.severity) combined += ` | Severity: ${next.severity}`
    if (options.reason && next.reason) combined += ` | Reason: ${next.reason}`
    if (options.year && next.year) combined += ` | Year: ${next.year}`

    onChange(combined)
  }

  return (
    <div className="space-y-2">
      <label className="flex gap-2 items-center text-sm font-semibold">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        {label}
      </label>

      {checked && (
        <div className="grid gap-2">
          <select
            className="border p-2 rounded"
            value={local.type}
            onChange={e => handleChange('type', e.target.value)}
          >
            <option value="">Select</option>
            {options.type.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {options.severity && (
            <select
              className="border p-2 rounded"
              value={local.severity}
              onChange={e => handleChange('severity', e.target.value)}
            >
              <option value="">Severity</option>
              {options.severity.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {options.reason && (
            <select
              className="border p-2 rounded"
              value={local.reason}
              onChange={e => handleChange('reason', e.target.value)}
            >
              <option value="">Reason</option>
              {options.reason.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          {options.year && (
            <input
              type="number"
              placeholder="Year"
              className="border p-2 rounded"
              value={local.year}
              onChange={e => handleChange('year', e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  )
}
