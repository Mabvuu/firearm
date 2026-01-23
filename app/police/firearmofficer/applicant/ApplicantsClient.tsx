'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

type ApplicantRow = {
  id: number
  applicant_name: string | null
  national_id: string | null
  phone: string | null
  address: string | null
  province: string | null
  district: string | null
  applicant_email: string
  created_at: string
  status: string
}

type ApplicantView = {
  key: string
  name: string
  national_id: string
  email: string
  phone: string
  address: string
  province: string
  district: string
  last_seen: string
  last_status: string
  application_count: number
  last_application_id: number
}

export default function ApplicantsClient({ initialData }: { initialData: ApplicantRow[] }) {
  const [query, setQuery] = useState('')
  const [openView, setOpenView] = useState(false)
  const [selected, setSelected] = useState<ApplicantView | null>(null)

  // ✅ dedupe applicants from applications table
  const aggregated = useMemo(() => {
    const map = new Map<string, ApplicantView>()

    for (const r of initialData) {
      const key = (r.national_id?.trim() || r.applicant_email.trim()).toLowerCase()

      const name = (r.applicant_name?.trim() || 'Unnamed Applicant')
      const national_id = (r.national_id?.trim() || '—')
      const phone = (r.phone?.trim() || '—')
      const address = (r.address?.trim() || '—')
      const province = (r.province?.trim() || '—')
      const district = (r.district?.trim() || '—')

      const current = map.get(key)

      if (!current) {
        map.set(key, {
          key,
          name,
          national_id,
          email: r.applicant_email,
          phone,
          address,
          province,
          district,
          last_seen: r.created_at,
          last_status: r.status,
          application_count: 1,
          last_application_id: r.id,
        })
      } else {
        current.application_count += 1
        // keep latest by created_at
        if (new Date(r.created_at).getTime() > new Date(current.last_seen).getTime()) {
          current.name = name
          current.national_id = national_id
          current.email = r.applicant_email
          current.phone = phone
          current.address = address
          current.province = province
          current.district = district
          current.last_seen = r.created_at
          current.last_status = r.status
          current.last_application_id = r.id
        }
        map.set(key, current)
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
    )
  }, [initialData])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return aggregated
    return aggregated.filter(a =>
      `${a.name} ${a.national_id} ${a.email} ${a.phone} ${a.last_application_id}`
        .toLowerCase()
        .includes(q)
    )
  }, [aggregated, query])

  const openDetails = (a: ApplicantView) => {
    setSelected(a)
    setOpenView(true)
  }

  return (
    <div className="space-y-2">
      {/* compact toolbar */}
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: COLORS.naturalAluminum }}>
        <Input
          className="h-9 max-w-[360px]"
          placeholder="Search name / national id / email / phone"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <span className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
          {filtered.length} applicants
        </span>

        {query.trim() ? (
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-2"
            onClick={() => setQuery('')}
            style={{ color: COLORS.blackBlue }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {/* file-like list (no big borders) */}
      <div style={{ borderTop: `1px solid ${COLORS.naturalAluminum}` }}>
        {filtered.length === 0 ? (
          <div className="p-3 text-sm" style={{ color: COLORS.coolGreyMedium }}>
            No applicants.
          </div>
        ) : (
          <div className="max-h-[75vh] overflow-y-auto bg-white">
            <ul className="divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
              {filtered.map((a, idx) => (
                <li key={a.key}>
                  <button
                    type="button"
                    onClick={() => openDetails(a)}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: COLORS.blackBlue }}>
                          {idx + 1}. {a.name}
                        </div>
                        <div className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                          {a.national_id} • {a.email} • Apps: {a.application_count}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px]" style={{ color: COLORS.coolGreyMedium }}>
                          {new Date(a.last_seen).toLocaleDateString()}
                        </span>
                        <span className="h-5 w-[1px]" style={{ backgroundColor: COLORS.naturalAluminum }} />
                        <span className="text-[11px]" style={{ color: COLORS.lamar }}>
                          View
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* details dialog */}
      <Dialog
        open={openView}
        onOpenChange={v => {
          setOpenView(v)
          if (!v) setSelected(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applicant</DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="text-sm text-muted-foreground">No applicant selected.</div>
          ) : (
            <div className="space-y-3">
              <div className="pb-2 border-b" style={{ borderColor: COLORS.naturalAluminum }}>
                <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                  {selected.name}
                </div>
                <div className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
                  {selected.national_id} • {selected.email}
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: COLORS.naturalAluminum }}>
                <Row n={1} label="Phone" value={selected.phone} />
                <Row n={2} label="Address" value={selected.address} />
                <Row n={3} label="Province" value={selected.province} />
                <Row n={4} label="District" value={selected.district} />
                <Row n={5} label="Applications" value={String(selected.application_count)} />
                <Row n={6} label="Last status" value={selected.last_status} />
                <Row n={7} label="Last seen" value={new Date(selected.last_seen).toLocaleString()} />
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setOpenView(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ n, label, value }: { n: number; label: string; value: string }) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium" style={{ color: COLORS.blackBlue }}>
          {n}. {label}
        </div>
        <div className="text-sm text-right" style={{ color: COLORS.coolGreyMedium }}>
          {value}
        </div>
      </div>
    </div>
  )
}
