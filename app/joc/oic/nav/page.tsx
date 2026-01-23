// app/joc/oic/nav/page.tsx
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
  'Morning.',
  'Afternoon.',
  'Evening.',
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
  if (RETURNING_GREETINGS.length > 1 && idx === lastIdx) {
    idx = (idx + 1) % RETURNING_GREETINGS.length
  }
  localStorage.setItem(lastIdxKey, String(idx))
  return RETURNING_GREETINGS[idx]
}

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

// ✅ role → human-readable label
const ROLE_LABELS: Record<string, string> = {
  'joc.oic': 'JOC Officer In Charge',
  joc_oic: 'JOC Officer In Charge',
}

export default function NavPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [greeting, setGreeting] = useState('')

  const navLinks = useMemo(
    () => [
      { href: '/joc/oic/dashboard', label: 'Home' },
      { href: '/joc/oic/application', label: 'Applications' },
      { href: '/joc/oic/records', label: 'Records' },
      
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

      setGreeting(pickGreeting(user.id))

      const { data: prof } = await supabase
        .from('profiles')
        .select('role,email')
        .eq('auth_uid', user.id)
        .maybeSingle()

      setProfile({
        email: prof?.email ?? user.email ?? '',
        role: prof?.role ?? 'joc.oic',
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

  const roleLabel =
    ROLE_LABELS[profile?.role ?? ''] ?? 'JOC Officer In Charge'

  return (
    <aside
      className="h-screen sticky top-0 self-start flex flex-col p-5 overflow-y-auto"
      style={{ backgroundColor: COLORS.lamar }}
    >
      {/* HEADER */}
      <div className="mb-8">
        {!mounted ? (
          <div className="space-y-3">
            <div
              className="h-7 w-48 rounded"
              style={{ backgroundColor: 'rgba(255,254,241,0.25)' }}
            />
            <div
              className="h-4 w-64 rounded"
              style={{ backgroundColor: 'rgba(255,254,241,0.18)' }}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <div
              className="text-xl font-semibold leading-tight"
              style={{ color: COLORS.snowWhite }}
            >
              {greeting}
            </div>

            <div
              className="text-sm leading-snug"
              style={{ color: COLORS.naturalAluminum }}
            >
              {roleLabel}
              {profile?.email ? <span> • {profile.email}</span> : null}
            </div>
          </div>
        )}
      </div>

      {/* NAV */}
      <nav className="flex flex-col gap-2">
        {navLinks.map(l => {
          const active = isActive(l.href)
          return (
            <Link key={l.href} href={l.href}>
              <Button
                variant="ghost"
                className="w-full justify-start h-11"
                style={{
                  backgroundColor: active
                    ? 'rgba(255,254,241,0.14)'
                    : 'transparent',
                  color: COLORS.snowWhite,
                  border: active
                    ? `1px solid ${COLORS.naturalAluminum}`
                    : '1px solid transparent',
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
            backgroundColor: COLORS.blackBlue,
            color: COLORS.snowWhite,
            border: `1px solid ${COLORS.naturalAluminum}`,
          }}
        >
          Logout
        </Button>
      </div>
    </aside>
  )
}
