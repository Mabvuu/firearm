// app/wallet/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Inventory = {
  id: number
  make: string
  model: string
  caliber: string | null
  serial: string | null
}

type Wallet = {
  id: string
  applicant_name: string
  created_at: string
  national_id?: string | null
}

type PublicWalletResponse = {
  wallet: Wallet | null
  guns: Array<{
    gun_uid: number
    application_id: number
    created_at: string
    gun: Inventory
  }>
}

type InventoryStateRow = {
  id: number
  ownership_state: string | null
}

const DEALER_ROLES = new Set(['dealer'])

export default function PublicWalletLookupPage() {
  const router = useRouter()

  const [nationalId, setNationalId] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [data, setData] = useState<PublicWalletResponse | null>(null)

  // blacklist state
  const [blacklisted, setBlacklisted] = useState<{ reason: string; created_at: string } | null>(null)

  // dealer role state
  const [myRole, setMyRole] = useState<string | null>(null)
  const isDealer = useMemo(() => (myRole ? DEALER_ROLES.has(myRole) : false), [myRole])

  // repossession state by gun_uid
  const [stateByGunUid, setStateByGunUid] = useState<Record<number, string>>({})

  // dealer reclaim modal state
  const [reclaimOpen, setReclaimOpen] = useState(false)
  const [reclaiming, setReclaiming] = useState(false)

  // cute popup
  const [popOpen, setPopOpen] = useState(false)
  const [popTitle, setPopTitle] = useState('Message')
  const [popText, setPopText] = useState('')

  const pop = (title: string, text: string) => {
    setPopTitle(title)
    setPopText(text)
    setPopOpen(true)
  }

  const canSearch = useMemo(() => nationalId.trim().length > 0, [nationalId])

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) return
      const { data: prof } = await supabase.from('profiles').select('role').eq('auth_uid', uid).single()
      setMyRole((prof?.role as string | null) ?? null)
    })()
  }, [])

  const checkBlacklist = async (nid: string) => {
    const id = nid.trim()
    if (!id) {
      setBlacklisted(null)
      return null
    }

    const { data, error } = await supabase
      .from('blacklist')
      .select('reason, created_at, active')
      .eq('kind', 'PERSON')
      .eq('national_id', id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error(error)
      setBlacklisted(null)
      return null
    }

    const row = (data ?? [])?.[0] as { reason: string; created_at: string; active: boolean } | undefined
    if (row?.active) {
      setBlacklisted({ reason: row.reason, created_at: row.created_at })
      return row
    }

    setBlacklisted(null)
    return null
  }

  const loadInventoryStates = async (gunUids: number[]) => {
    if (!gunUids.length) {
      setStateByGunUid({})
      return
    }

    const { data, error } = await supabase
      .from('inventory')
      .select('id, ownership_state')
      .in('id', gunUids)

    if (error) {
      console.error(error)
      setStateByGunUid({})
      return
    }

    const map: Record<number, string> = {}
    ;((data ?? []) as InventoryStateRow[]).forEach(r => {
      map[r.id] = (r.ownership_state ?? '').toUpperCase()
    })
    setStateByGunUid(map)
  }

  const onSearch = async () => {
    const id = nationalId.trim()
    if (!id) return

    setLoading(true)
    setErrorMsg(null)
    setData(null)
    setBlacklisted(null)
    setStateByGunUid({})

    const { data: rpcData, error } = await supabase.rpc('get_wallet_public', {
      p_wallet_id: id,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    const parsed = rpcData as PublicWalletResponse

    if (!parsed?.wallet) {
      setErrorMsg('This wallet does not exist')
      setLoading(false)
      return
    }

    parsed.wallet.national_id = parsed.wallet.national_id ?? id
    setData(parsed)

    // check blacklist
    const bl = await checkBlacklist(id)
    if (bl?.active) {
      pop(
        'Wallet blacklisted',
        `This wallet National ID has been blacklisted.\nReason: ${bl.reason}\n\nIf the firearm is still in their possession, it must be handed over to a dealer within 24 hours.`,
      )
    }

    // load repossession state for gun_uids so we can grey them out
    const gunUids = Array.from(new Set((parsed.guns ?? []).map(g => g.gun_uid).filter(Boolean)))
    await loadInventoryStates(gunUids)

    setLoading(false)
  }

  const handleScan = () => {
    const fakeId = '63-123456-A12'
    setNationalId(fakeId)
    setTimeout(() => onSearch(), 200)
  }

  const openReclaim = () => {
    if (!blacklisted) return pop('Not allowed', 'This wallet is not blacklisted.')
    if (!data?.wallet) return pop('Not allowed', 'Search a wallet first.')
    if (!data.guns?.length) return pop('Nothing to reclaim', 'This wallet has no firearms linked.')
    if (!isDealer) return pop('Not authorised', 'Only a dealer can reclaim firearms.')
    setReclaimOpen(true)
  }

  // IMPORTANT:
  // This assumes inventory has: owner_id, wallet_id, ownership_state.
  // It will set ownership_state='REPOSSESSED' so the wallet view can grey it out.
  const reclaimToDealerInventory = async () => {
    if (!isDealer) return pop('Not authorised', 'Only a dealer can reclaim firearms.')
    if (!data?.wallet) return pop('Not allowed', 'Search a wallet first.')
    if (!blacklisted) return pop('Not allowed', 'This wallet is not blacklisted.')
    if (!data.guns?.length) return pop('Not allowed', 'No linked firearms to reclaim.')

    setReclaiming(true)

    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser()
      if (authErr || !auth.user?.id) {
        setReclaiming(false)
        return pop('Not logged in', 'Please log in as a dealer.')
      }

      const dealerUid = auth.user.id
      const gunIds = Array.from(new Set(data.guns.map(g => g.gun_uid)))

      const { error: upErr } = await supabase
        .from('inventory')
        .update({
          owner_id: dealerUid,
          wallet_id: null,
          ownership_state: 'REPOSSESSED',
        })
        .in('id', gunIds)

      if (upErr) {
        setReclaiming(false)
        return pop('Failed', upErr.message)
      }

      // refresh states so wallet shows grey immediately
      await loadInventoryStates(gunIds)

      setReclaimOpen(false)
      setReclaiming(false)
      pop('Repossessed', 'Firearm(s) have been moved to dealer inventory and marked as repossessed.')
    } catch (e) {
      console.error(e)
      setReclaiming(false)
      pop('Failed', 'Unexpected error.')
    }
  }

  const isRepossessed = (gunUid: number) => (stateByGunUid[gunUid] ?? '') === 'REPOSSESSED'

  return (
    <div className="min-h-screen bg-neutral-100 p-6 flex justify-center items-start">
      <div className="w-full max-w-2xl space-y-6">
        <Button
  variant="outline"
  onClick={() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/dealer/dashboard') // fallback if opened directly
    }
  }}
  className="rounded-lg"
>
  ← Back
</Button>

        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <div className="text-sm text-muted-foreground">Scan or enter National ID to view digital firearm license.</div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleScan} disabled={loading}>
              Scan
            </Button>

            <Input value={nationalId} onChange={e => setNationalId(e.target.value)} placeholder="National ID" />

            <Button disabled={!canSearch || loading} onClick={onSearch}>
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </div>

          {errorMsg && <div className="border rounded p-3 text-sm text-red-600">{errorMsg}</div>}
        </div>

        {/* BLACKLIST NOTICE + DEALER RECLAIM CTA */}
        {data?.wallet && blacklisted && (
          <div className="bg-white rounded-xl shadow p-4 border border-red-200">
            <div className="text-sm font-semibold text-red-700">This wallet National ID has been blacklisted.</div>
            <div className="text-sm mt-1">
              <b>Reason:</b> {blacklisted.reason}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Blacklisted on: {new Date(blacklisted.created_at).toLocaleString()}
            </div>

            <div className="mt-3 text-sm">
              If the firearm is still in their possession, it must be handed over to a dealer within <b>24 hours</b>.
            </div>

            <div className="mt-3 flex gap-2 flex-wrap">
              <Button onClick={openReclaim} disabled={!isDealer}>
                Dealer repossess
              </Button>
              {!isDealer && (
                <div className="text-xs text-muted-foreground self-center">Only a dealer can repossess.</div>
              )}
            </div>
          </div>
        )}

        {/* DIGITAL LICENSE CARD */}
        {data?.wallet && (
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400">Firearm License</div>
                  <div className="text-2xl font-bold mt-1">{data.wallet.applicant_name}</div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  Wallet ID
                  <div className="text-white text-sm font-mono mt-1">{data.wallet.id}</div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 space-y-3">
                <div className="text-sm text-slate-400">Licensed Firearms</div>

                {!data.guns?.length ? (
                  <div className="text-sm text-slate-400">No firearms linked.</div>
                ) : (
                  data.guns.map((g, idx) => {
                    const repo = isRepossessed(g.gun_uid)
                    return (
                      <div
                        key={`${g.gun_uid}-${idx}`}
                        className={[
                          'rounded-lg p-4 text-sm space-y-1 border border-slate-700/40',
                          repo ? 'bg-slate-900/40 opacity-60 grayscale' : 'bg-slate-800',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">
                            {g.gun.make} {g.gun.model}
                          </div>

                          {repo && (
                            <span className="text-[10px] uppercase tracking-widest bg-slate-700/60 px-2 py-1 rounded">
                              Repossessed
                            </span>
                          )}
                        </div>

                        <div className="text-slate-400">Caliber: {g.gun.caliber ?? 'N/A'}</div>
                        <div className="text-slate-400">Serial: {g.gun.serial ?? 'N/A'}</div>

                        {repo && (
                          <div className="text-slate-400 text-xs pt-1">
                            This firearm has been repossessed and moved to dealer inventory.
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="text-xs text-slate-500 pt-2">
                Issued: {new Date(data.wallet.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* DEALER REPOSSESS CONFIRM */}
        <Dialog open={reclaimOpen} onOpenChange={setReclaimOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dealer repossess</DialogTitle>
              <DialogDescription style={{ whiteSpace: 'pre-line' }}>
                This will move linked firearm(s) from the wallet to dealer inventory and mark them as REPOSSESSED.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReclaimOpen(false)} disabled={reclaiming}>
                Cancel
              </Button>
              <Button onClick={reclaimToDealerInventory} disabled={reclaiming}>
                {reclaiming ? 'Processing…' : 'Confirm repossess'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CUTE POPUP FOR ALL NOTIFICATIONS */}
        <Dialog open={popOpen} onOpenChange={setPopOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{popTitle}</DialogTitle>
              <DialogDescription style={{ whiteSpace: 'pre-line' }}>{popText}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setPopOpen(false)}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}