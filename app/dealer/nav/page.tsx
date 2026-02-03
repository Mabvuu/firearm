// firearm-system/app/dealer/nav/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

type Profile = { role: string; email: string }

type DealerCreditsRow = {
  balance: number
}

const FIRST_TIME_GREETING = 'Hi — welcome'
const RETURNING_GREETINGS = [
  'Welcome back.',
  'Hey.',
  'Good to see you.',
  'Let’s continue.',
  'Ready when you are.',
  'Back again.',
  'Let’s move.',
  'Let’s do this.',
  'We keep going.',
  'Hey, welcome back.',
]

function pickNextGreeting(uid: string) {
  const greetedKey = `nav_greeted_${uid}`
  const lastIdxKey = `nav_greet_idx_${uid}`

  const greeted = localStorage.getItem(greetedKey) === '1'
  if (!greeted) {
    localStorage.setItem(greetedKey, '1')
    localStorage.setItem(lastIdxKey, '-1')
    return FIRST_TIME_GREETING
  }

  const lastIdx = Number(localStorage.getItem(lastIdxKey) ?? '-1')
  let idx = Math.floor(Math.random() * RETURNING_GREETINGS.length)
  if (RETURNING_GREETINGS.length > 1 && idx === lastIdx) idx = (idx + 1) % RETURNING_GREETINGS.length
  localStorage.setItem(lastIdxKey, String(idx))
  return RETURNING_GREETINGS[idx]
}

export default function NavPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [greeting, setGreeting] = useState('')

  const [credits, setCredits] = useState<number | null>(null)

  const navLinks = useMemo(
    () => [
      { href: '/dealer/dashboard', label: 'Home' },
      { href: '/dealer/mint', label: 'Mint' },
      { href: '/dealer/application', label: 'Application' },
      { href: '/dealer/inventory', label: 'Inventory' },
      { href: '/dealer/audit', label: 'Audit' },
      { href: '/dealer/firearm', label: 'Firearm' },
    ],
    []
  )

  useEffect(() => {
    const init = async () => {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes.user
      if (!user) {
        setMounted(true)
        router.replace('/login')
        return
      }

      setGreeting(pickNextGreeting(user.id))

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('role,email')
        .eq('auth_uid', user.id)
        .maybeSingle()

      if (!error && prof?.email && prof?.role) setProfile({ email: prof.email, role: prof.role })
      else setProfile({ email: user.email ?? '', role: '' })

      // ✅ NEW CREDITS SOURCE:
      // dealer_credits(dealer_id = auth user id, balance)
      const { data: c, error: cErr } = await supabase
        .from('dealer_credits')
        .select('balance')
        .eq('dealer_id', user.id)
        .maybeSingle<DealerCreditsRow>()

      if (!cErr && c) setCredits(typeof c.balance === 'number' ? c.balance : 0)
      else setCredits(0)

      setMounted(true)
    }

    setTimeout(() => void init(), 0)
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const linkBtn = (href: string, label: string) => {
    const active = pathname === href
    return (
      <Link key={href} href={href}>
        <Button
          variant="ghost"
          className={[
            'w-full justify-start',
            active ? 'bg-[#2F4F6F]/15 text-[#1F2A35] font-semibold' : 'text-[#1F2A35]/90',
            'hover:bg-[#2F4F6F]/10 hover:text-[#1F2A35]',
          ].join(' ')}
        >
          <span
            className={[
              'mr-2 h-2 w-2 rounded-full',
              active ? 'bg-[#2F4F6F]' : 'bg-[#B5B5B3]',
            ].join(' ')}
          />
          {label}
        </Button>
      </Link>
    )
  }

  if (!mounted) {
    return (
      <aside className="h-full p-4 flex flex-col bg-[#F7F6F2]">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-black/10" />
          <div className="h-3 w-56 rounded bg-black/10" />
          <div className="h-3 w-44 rounded bg-black/10" />
        </div>
      </aside>
    )
  }

  return (
    <aside
      className={[
        'sticky top-0 h-screen',
        'p-4 flex flex-col',
        'bg-[#F7F6F2]',
        'border-r border-black/10',
      ].join(' ')}
    >
      {/* Header panel */}
      <div className="mb-5 rounded-xl border border-black/10 bg-white p-3">
        <div className="text-base font-semibold text-[#1F2A35]">{greeting}</div>
        <div className="mt-1 text-xs text-[#1F2A35]/70">
          {profile?.role ? <span className="uppercase tracking-wide">{profile.role}</span> : <span>—</span>}
          {profile?.email ? <span> • {profile.email}</span> : null}
        </div>
        <div className="mt-3 h-1 w-full rounded-full bg-[#2F4F6F]/15">
          <div className="h-1 w-1/2 rounded-full bg-[#2F4F6F]" />
        </div>
      </div>

      {/* ✅ Credits (no managed wallet display anymore) */}
      <div className="mb-5 rounded-xl border border-black/10 bg-white p-3 space-y-2">
        <div className="text-xs text-[#1F2A35]/70">Mint credits</div>

        <div className="mt-2 rounded-md bg-[#F7F6F2] border border-black/10 p-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#1F2A35]/70">Credits</div>
            <div className="text-sm font-semibold text-[#1F2A35]">
              {credits === null ? '—' : credits}
            </div>
          </div>
          <div className="mt-1 text-[11px] text-[#1F2A35]/60">1 mint = 1 credit</div>
        </div>

        <Link href="/dealer/renew">
          <Button variant="outline" size="sm" className="w-full border-black/15 text-[#1F2A35]">
            Renew / Buy Credits
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">{navLinks.map((l) => linkBtn(l.href, l.label))}</nav>

      {/* Logout */}
      <div className="mt-auto pt-6">
        <Button className="w-full text-white" style={{ backgroundColor: '#B65A4A' }} onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </aside>
  )
}
