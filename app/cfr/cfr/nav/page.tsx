// app/cfr/nav/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

type Profile = { role: string; email: string }

const FIRST_TIME_GREETING = 'Hi, welcome.'
const RETURNING_GREETINGS = [
  'Welcome back.',
  'Hi again.',
  'Hello.',
  'Hey.',
  'Good to see you.',
  'How are you today?',
  'Hi there.',
  'Hello again.',
]

function pickGreeting(uid: string) {
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
  if (idx === lastIdx) idx = (idx + 1) % RETURNING_GREETINGS.length
  localStorage.setItem(lastIdxKey, String(idx))
  return RETURNING_GREETINGS[idx]
}

/* 🎨 GRAY PALETTE (inline, as requested) */
const COLORS = {
  background: '#ACACAC',        // cool grey medium
  panel: '#D9D8D6',             // natural aluminum
  textPrimary: '#212B37',       // black blue
  textSecondary: '#FAF9EC',     // snow white
  activeBg: 'rgba(255,255,255,0.25)',
  border: 'rgba(0,0,0,0.15)',
} as const

export default function NavPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [greeting, setGreeting] = useState('')

  const navLinks = useMemo(
    () => [
      { href: '/cfr/cfr/dashboard', label: 'Home' },
      { href: '/cfr/cfr/application', label: 'Applications' },
      { href: '/cfr/cfr/applicants', label: 'Applicants' },
     
    ],
    []
  )

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setMounted(true)
        router.replace('/login')
        return
      }

      setGreeting(pickGreeting(user.id))
      setProfile({
        role: 'cfr',
        email: user.email ?? '',
      })
      setMounted(true)
    }

    setTimeout(() => void init(), 0)
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/')

  return (
    <aside
      className="h-screen sticky top-0 self-start flex flex-col p-5"
      style={{ backgroundColor: COLORS.background }}
    >
      {/* HEADER */}
      <div className="mb-8">
        {!mounted ? (
          <div className="space-y-3">
            <div className="h-7 w-48 rounded" style={{ backgroundColor: COLORS.activeBg }} />
            <div className="h-4 w-64 rounded" style={{ backgroundColor: COLORS.activeBg }} />
          </div>
        ) : (
          <div className="space-y-1">
            <div
              className="text-xl font-semibold leading-tight"
              style={{ color: COLORS.textPrimary }}
            >
              {greeting}
            </div>

            <div
              className="text-sm leading-snug"
              style={{ color: COLORS.textPrimary, opacity: 0.75 }}
            >
              {profile?.role}
              {profile?.email ? <span> • {profile.email}</span> : null}
            </div>
          </div>
        )}
      </div>

      {/* NAV */}
      <nav className="flex flex-col gap-2">
        {navLinks.map((l) => {
          const active = isActive(l.href)
          return (
            <Link key={l.href} href={l.href}>
              <Button
                variant="ghost"
                className="w-full justify-start h-11"
                style={{
                  backgroundColor: active ? COLORS.activeBg : 'transparent',
                  color: COLORS.textPrimary,
                  border: active ? `1px solid ${COLORS.border}` : '1px solid transparent',
                }}
              >
                <span className="text-base">{l.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* LOGOUT */}
      <div className="mt-auto pt-8">
        <Button
          className="w-full h-11 text-base"
          onClick={handleLogout}
          style={{
            backgroundColor: COLORS.textPrimary,
            color: COLORS.textSecondary,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          Logout
        </Button>
      </div>
    </aside>
  )
}
