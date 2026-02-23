// firearm-system/app/blacklist/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Kind = 'PERSON' | 'FIREARM'

type BlacklistRow = {
  id: string
  kind: Kind
  national_id: string | null
  gun_uid: number | null
  reason: string
  active: boolean
  created_at: string
  created_by_uid: string | null

  removed_at?: string | null
  removed_by_uid?: string | null
  removed_reason?: string | null
}

type ProfileMini = { auth_uid: string; email: string | null; role: string | null }

// ✅ Adjust if your table/columns differ
const GUNS_TABLE = 'guns'
const GUNS_ID_COL = 'id'
const GUNS_SERIAL_COL = 'serial'

type GunIdRow = Record<typeof GUNS_ID_COL, number>
type GunSerialRow = Record<typeof GUNS_ID_COL, number> & Record<typeof GUNS_SERIAL_COL, string | null>

// ✅ Only these roles can add/remove/reactivate
const ROLE_CAN_WRITE = new Set(['dealer', 'police.oic', 'joc.oic'])

const ROLE_LABEL: Record<string, string> = {
  dealer: 'Dealer',
  'police.firearmofficer': 'Police Firearm Officer',
  'police.oic': 'Police OIC',
  'police.ioc': 'Police IOC',
  'cfr.cfr': 'CFR',
  'cfr.dispol': 'District Police',
  'cfr.propol': 'Provincial Police',
  'joc.oic': 'JOC OIC',
  'joc.mid': 'JOC MID',
  'joc.controller': 'JOC Controller',
}

const PERSON_REASONS = [
  'Stolen firearm report',
  'Domestic violence case',
  'Threats / intimidation',
  'Fraud / identity issues',
  'Mental health risk reported',
  'Court order / restraining order',
  'Under investigation',
  'Other',
] as const

const FIREARM_REASONS = [
  'Reported stolen',
  'Unregistered firearm',
  'Ballistics match / evidence',
  'Tampered serial / defaced',
  'Seized by police',
  'Linked to active case',
  'Other',
] as const

const REMOVE_REASONS = [
  'Case resolved',
  'Court cleared / order lifted',
  'Mistaken entry',
  'Data correction',
  'Administrative removal',
  'Other',
] as const

export default function BlacklistPage() {
  const router = useRouter()

  const [profileRole, setProfileRole] = useState<string | null>(null)
  const [myEmail, setMyEmail] = useState<string | null>(null)

  const [rows, setRows] = useState<BlacklistRow[]>([])
  const [profilesByUid, setProfilesByUid] = useState<Record<string, { email: string; role: string }>>({})
  const [serialByGunUid, setSerialByGunUid] = useState<Record<number, string>>({})

  const [loading, setLoading] = useState(false)

  const [toastOpen, setToastOpen] = useState(false)
  const [toastTitle, setToastTitle] = useState('Message')
  const [toastText, setToastText] = useState<string>('')

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [q, setQ] = useState('')

  // add modal
  const [addOpen, setAddOpen] = useState(false)
  const [kind, setKind] = useState<Kind>('PERSON')
  const [nationalId, setNationalId] = useState('')
  const [serialInput, setSerialInput] = useState('') // ✅ user types serial (not uid)

  const [reasonPreset, setReasonPreset] = useState<string>(PERSON_REASONS[0])
  const [reasonCustom, setReasonCustom] = useState('')

  // remove modal
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeRow, setRemoveRow] = useState<BlacklistRow | null>(null)
  const [removePreset, setRemovePreset] = useState<string>(REMOVE_REASONS[0])
  const [removeCustom, setRemoveCustom] = useState('')

  const canWrite = useMemo(() => (profileRole ? ROLE_CAN_WRITE.has(profileRole) : false), [profileRole])

  const notify = (title: string, text: string) => {
    setToastTitle(title)
    setToastText(text)
    setToastOpen(true)
  }

  useEffect(() => {
    if (kind === 'PERSON') setReasonPreset(PERSON_REASONS[0])
    else setReasonPreset(FIREARM_REASONS[0])
    setReasonCustom('')
  }, [kind])

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) return

      setMyEmail(auth.user?.email ?? null)

      const { data: prof } = await supabase.from('profiles').select('role').eq('auth_uid', uid).single()
      setProfileRole(prof?.role ?? null)
    })()
  }, [])

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  const loadProfilesForRows = async (list: BlacklistRow[]) => {
    const uids = Array.from(new Set(list.flatMap(r => [r.created_by_uid, r.removed_by_uid].filter(Boolean) as string[])))
    if (!uids.length) {
      setProfilesByUid({})
      return
    }

    const { data, error } = await supabase.from('profiles').select('auth_uid,email,role').in('auth_uid', uids)
    if (error) return

    const map: Record<string, { email: string; role: string }> = {}
    ;((data ?? []) as ProfileMini[]).forEach(p => {
      map[p.auth_uid] = { email: p.email ?? '—', role: p.role ?? '—' }
    })
    setProfilesByUid(map)
  }

  const loadSerialsForRows = async (list: BlacklistRow[]) => {
    const gunUids = Array.from(
      new Set(list.filter(r => r.kind === 'FIREARM' && r.gun_uid != null).map(r => r.gun_uid as number)),
    )
    if (!gunUids.length) {
      setSerialByGunUid({})
      return
    }

    const { data, error } = await supabase
      .from(GUNS_TABLE)
      .select(`${GUNS_ID_COL},${GUNS_SERIAL_COL}`)
      .in(GUNS_ID_COL, gunUids)

    if (error) return

    const map: Record<number, string> = {}
    ;((data ?? []) as GunSerialRow[]).forEach(g => {
      const id = Number(g[GUNS_ID_COL])
      const serial = g[GUNS_SERIAL_COL] ?? ''
      if (!Number.isNaN(id) && serial) map[id] = serial
    })
    setSerialByGunUid(map)
  }

  const getMatchingGunUidsBySerial = async (search: string) => {
    const s = search.trim()
    if (!s) return [] as number[]

    const { data, error } = await supabase
      .from(GUNS_TABLE)
      .select(`${GUNS_ID_COL}`)
      .ilike(GUNS_SERIAL_COL, `%${s}%`)
      .limit(50)

    if (error) return [] as number[]
    return ((data ?? []) as GunIdRow[])
      .map(g => Number(g[GUNS_ID_COL]))
      .filter(n => !Number.isNaN(n))
  }

  const load = async () => {
    setLoading(true)

    let query = supabase.from('blacklist').select('*').order('created_at', { ascending: false })

    if (filter === 'ACTIVE') query = query.eq('active', true)
    if (filter === 'INACTIVE') query = query.eq('active', false)

    const search = q.trim()
    if (search) {
      const gunUids = await getMatchingGunUidsBySerial(search)

      if (gunUids.length) {
        query = query.or(`national_id.ilike.%${search}%,gun_uid.in.(${gunUids.join(',')})`)
      } else {
        query = query.or(`national_id.ilike.%${search}%`)
      }
    }

    const { data, error } = await query
    if (error) {
      notify('Error', error.message)
      setRows([])
      setLoading(false)
      return
    }

    const list = (data ?? []) as BlacklistRow[]
    setRows(list)
    await Promise.all([loadProfilesForRows(list), loadSerialsForRows(list)])

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const openAdd = () => {
    if (!canWrite) return notify('Not authorised', 'You are not authorised to add to blacklist.')
    setAddOpen(true)
  }

  const getFinalReason = () => {
    if (reasonPreset === 'Other') return reasonCustom.trim()
    return String(reasonPreset).trim()
  }

  const resolveGunUidFromSerial = async (serial: string) => {
    const s = serial.trim()
    if (!s) return { gunUid: null as number | null, error: 'Serial number is required.' }

    const { data, error } = await supabase
      .from(GUNS_TABLE)
      .select(`${GUNS_ID_COL},${GUNS_SERIAL_COL}`)
      .eq(GUNS_SERIAL_COL, s)
      .limit(1)

    if (error) return { gunUid: null, error: error.message }

    const row = (data ?? [])?.[0] as GunSerialRow | undefined
    const gunUid = row ? Number(row[GUNS_ID_COL]) : null
    if (!gunUid || Number.isNaN(gunUid)) return { gunUid: null, error: 'Serial not found in guns table.' }

    return { gunUid, error: null as string | null }
  }

  const ensureWalletExistsForGunUid = async (gunUid: number) => {
    const { data, error } = await supabase.from('wallet').select('id').eq('gun_uid', gunUid).limit(1)
    if (error) return { ok: false, error: error.message }
    const exists = !!(data && data.length)
    if (!exists) {
      return {
        ok: false,
        error: 'This firearm has no wallet yet. Only firearms that already have a wallet can be blacklisted.',
      }
    }
    return { ok: true, error: null as string | null }
  }

  const addEntry = async () => {
    if (!canWrite) return notify('Not authorised', 'You are not authorised to add to blacklist.')

    const finalReason = getFinalReason()
    if (!finalReason) return notify('Missing info', 'Reason is required.')

    const { data: auth } = await supabase.auth.getUser()
    const createdBy = auth.user?.id ?? null

    if (kind === 'PERSON') {
      const nid = nationalId.trim()
      if (!nid) return notify('Missing info', 'National ID is required for PERSON.')

      const { error } = await supabase.from('blacklist').insert({
        kind,
        national_id: nid,
        gun_uid: null,
        reason: finalReason,
        active: true,
        created_by_uid: createdBy,
      })

      if (error) return notify('Error', error.message)

      setNationalId('')
      setReasonCustom('')
      setAddOpen(false)
      notify('Done', 'Added to blacklist.')
      load()
      return
    }

    const { gunUid, error: serialErr } = await resolveGunUidFromSerial(serialInput)
    if (serialErr || !gunUid) return notify('Error', serialErr ?? 'Failed to resolve serial.')

    const walletCheck = await ensureWalletExistsForGunUid(gunUid)
    if (!walletCheck.ok) return notify('Not allowed', walletCheck.error ?? 'Not allowed.')

    const { error } = await supabase.from('blacklist').insert({
      kind,
      national_id: null,
      gun_uid: gunUid,
      reason: finalReason,
      active: true,
      created_by_uid: createdBy,
    })

    if (error) return notify('Error', error.message)

    setSerialInput('')
    setReasonCustom('')
    setAddOpen(false)
    notify('Done', 'Added to blacklist.')
    load()
  }

  const openRemove = (row: BlacklistRow) => {
    if (!canWrite) return notify('Not authorised', 'You are not authorised to remove from blacklist.')
    setRemoveRow(row)
    setRemovePreset(REMOVE_REASONS[0])
    setRemoveCustom('')
    setRemoveOpen(true)
  }

  const getFinalRemoveReason = () => {
    if (removePreset === 'Other') return removeCustom.trim()
    return String(removePreset).trim()
  }

  const confirmRemove = async () => {
    if (!removeRow) return
    if (!canWrite) return notify('Not authorised', 'You are not authorised to remove from blacklist.')

    const rr = getFinalRemoveReason()
    if (!rr) return notify('Missing info', 'Removal reason is required.')

    const { data: auth } = await supabase.auth.getUser()
    const removedBy = auth.user?.id ?? null
    const removedAt = new Date().toISOString()

    const { error } = await supabase
      .from('blacklist')
      .update({
        active: false,
        removed_reason: rr,
        removed_by_uid: removedBy,
        removed_at: removedAt,
      })
      .eq('id', removeRow.id)

    if (error) return notify('Error', error.message)

    setRemoveOpen(false)
    setRemoveRow(null)
    notify('Done', 'Removed from blacklist.')
    load()
  }

  const reactivate = async (row: BlacklistRow) => {
    if (!canWrite) return notify('Not authorised', 'You are not authorised to re-activate blacklist entries.')

    const { error } = await supabase
      .from('blacklist')
      .update({
        active: true,
        removed_reason: null,
        removed_by_uid: null,
        removed_at: null,
      })
      .eq('id', row.id)

    if (error) return notify('Error', error.message)

    notify('Done', 'Re-activated.')
    load()
  }

  const reasonOptions = kind === 'PERSON' ? PERSON_REASONS : FIREARM_REASONS

  return (
    <div className="w-full min-h-[calc(100vh-0px)] bg-background p-4 sm:p-6">
      <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" className="px-2" onClick={goBack}>
            ← Back
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold">Blacklist</h1>
            <Badge variant="outline">{filter}</Badge>
            <Badge variant={canWrite ? 'default' : 'secondary'}>{canWrite ? 'Can Edit' : 'Read Only'}</Badge>
            {profileRole ? <Badge variant="outline">Role: {ROLE_LABEL[profileRole] ?? profileRole}</Badge> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openAdd}>Add</Button>
        </div>
      </div>

      <div className="w-full mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant={filter === 'ACTIVE' ? 'default' : 'outline'} onClick={() => setFilter('ACTIVE')}>
            Active
          </Button>
          <Button variant={filter === 'INACTIVE' ? 'default' : 'outline'} onClick={() => setFilter('INACTIVE')}>
            Inactive
          </Button>
          <Button variant={filter === 'ALL' ? 'default' : 'outline'} onClick={() => setFilter('ALL')}>
            All
          </Button>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search National ID or Serial Number"
            className="w-full md:w-80"
          />
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Search'}
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="w-full">
        <Card className="border-0 shadow-none">
          <CardHeader className="px-0">
            <CardTitle className="text-lg font-semibold">Entries</CardTitle>
          </CardHeader>

          <CardContent className="px-0 space-y-2">
            {!rows.length ? (
              <div className="text-sm text-muted-foreground">No entries found.</div>
            ) : (
              rows.map(r => {
                const createdBy = r.created_by_uid ? profilesByUid[r.created_by_uid] : null
                const createdEmail = createdBy?.email || '—'
                const createdRole = createdBy?.role ? ROLE_LABEL[createdBy.role] ?? createdBy.role : '—'

                const removedByUid = r.removed_by_uid ?? null
                const removedAt = r.removed_at ?? null
                const removedReason = r.removed_reason ?? null
                const removedBy = removedByUid ? profilesByUid[removedByUid] : null
                const removedEmail = removedBy?.email || '—'
                const removedRole = removedBy?.role ? ROLE_LABEL[removedBy.role] ?? removedBy.role : '—'

                const serial = r.kind === 'FIREARM' && r.gun_uid != null ? serialByGunUid[r.gun_uid] : undefined

                return (
                  <div key={r.id} className="rounded-xl border border-neutral-200 p-4 flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{r.kind}</Badge>
                          <Badge variant={r.active ? 'default' : 'secondary'}>
                            {r.active ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </div>

                        <div className="text-sm">
                          {r.kind === 'PERSON' ? (
                            <>
                              <b>National ID:</b> {r.national_id}
                            </>
                          ) : (
                            <>
                              <b>Serial Number:</b> {serial || '—'}
                            </>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <b>Reason:</b> {r.reason}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <b>Added by:</b> {createdEmail} • {createdRole} • {new Date(r.created_at).toLocaleString()}
                        </div>

                        {!r.active && (
                          <div className="text-xs text-muted-foreground">
                            <b>Removed:</b> {removedAt ? new Date(removedAt).toLocaleString() : '—'} • {removedEmail}{' '}
                            • {removedRole}
                            {removedReason ? (
                              <>
                                {' • '}
                                <b>Why:</b> {removedReason}
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {r.active ? (
                          <Button variant="destructive" onClick={() => openRemove(r)}>
                            Remove
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={() => reactivate(r)}>
                            Re-activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {myEmail ? <div className="mt-4 text-xs text-muted-foreground">Logged in as: {myEmail}</div> : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add to blacklist</DialogTitle>
            <DialogDescription>Only dealer, police.oic, and joc.oic can add entries.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-3">
              <label className="text-xs text-muted-foreground">Kind</label>
              <select
                className="h-11 w-full rounded-lg border border-neutral-300 px-3 bg-background"
                value={kind}
                onChange={e => setKind(e.target.value as Kind)}
              >
                <option value="PERSON">PERSON</option>
                <option value="FIREARM">FIREARM</option>
              </select>
            </div>

            <div className="sm:col-span-9">
              <label className="text-xs text-muted-foreground">{kind === 'PERSON' ? 'National ID' : 'Serial Number'}</label>
              {kind === 'PERSON' ? (
                <Input
                  className="h-11"
                  placeholder="National ID"
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value)}
                />
              ) : (
                <Input
                  className="h-11"
                  placeholder="Serial Number"
                  value={serialInput}
                  onChange={e => setSerialInput(e.target.value)}
                />
              )}
            </div>

            <div className="sm:col-span-12">
              <label className="text-xs text-muted-foreground">Reason</label>
              <select
                className="h-11 w-full rounded-lg border border-neutral-300 px-3 bg-background"
                value={reasonPreset}
                onChange={e => setReasonPreset(e.target.value)}
              >
                {reasonOptions.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-12">
              <label className="text-xs text-muted-foreground">Custom reason (only if Other)</label>
              <Input
                className="h-11"
                placeholder={reasonPreset === 'Other' ? 'Type reason…' : '—'}
                value={reasonCustom}
                onChange={e => setReasonCustom(e.target.value)}
                disabled={reasonPreset !== 'Other'}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addEntry}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeOpen}
        onOpenChange={open => (open ? setRemoveOpen(true) : (setRemoveOpen(false), setRemoveRow(null)))}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Remove from blacklist</DialogTitle>
            <DialogDescription>Sets entry to inactive and stores removal reason.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm">
              {removeRow?.kind === 'PERSON' ? (
                <>
                  <b>National ID:</b> {removeRow?.national_id}
                </>
              ) : (
                <>
                  <b>Serial Number:</b> {removeRow?.gun_uid != null ? serialByGunUid[removeRow.gun_uid] ?? '—' : '—'}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <label className="text-xs text-muted-foreground">Removal reason</label>
                <select
                  className="h-11 w-full rounded-lg border border-neutral-300 px-3 bg-background"
                  value={removePreset}
                  onChange={e => setRemovePreset(e.target.value)}
                >
                  {REMOVE_REASONS.map(rr => (
                    <option key={rr} value={rr}>
                      {rr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="text-xs text-muted-foreground">Custom (only if Other)</label>
                <Input
                  className="h-11"
                  placeholder={removePreset === 'Other' ? 'Type reason…' : '—'}
                  value={removeCustom}
                  onChange={e => setRemoveCustom(e.target.value)}
                  disabled={removePreset !== 'Other'}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Confirm remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={toastOpen} onOpenChange={setToastOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{toastTitle}</DialogTitle>
            <DialogDescription>{toastText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setToastOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}