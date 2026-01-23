// app/joc/oic/nav/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

type Profile = { email: string | null }

const FIRST_TIME_GREETING = 'Hi, welcome.'
const RETURNING_GREETINGS = ['Welcome back.', 'Hello.', 'Hi.', 'Hey.', 'Good to see you.']

function pickGreeting(uid: string) {
  const key = `nav_greeted_${uid}`
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, '1')
    return FIRST_TIME_GREETING
  }
  return RETURNING_GREETINGS[Math.floor(Math.random() * RETURNING_GREETINGS.length)]
}

export default function NavPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [profile, setProfile] = useState<Profile>({ email: null })

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        router.replace('/login')
        return
      }

      setGreeting(pickGreeting(user.id))
      setProfile({ email: user.email ?? null })
      setMounted(true)
    }

    setTimeout(() => void init(), 0)
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const item = (href: string, label: string) => (
    <Link href={href}>
      <Button
        variant="ghost"
        className={`w-full justify-start ${pathname === href ? 'bg-muted font-semibold' : ''}`}
      >
        {label}
      </Button>
    </Link>
  )

  return (
    <aside className="h-full p-4 flex flex-col sticky top-0 self-start">
      {/* replace LOGO */}
      <div className="mb-6">
        {!mounted ? (
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-4 w-48 rounded bg-muted" />
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-base font-semibold">{greeting}</div>
            <div className="text-lg font-semibold tracking-wide text-neutral-700">
              OFFICER IN CHARGE
            </div>
            {profile.email && <div className="text-xs text-muted-foreground">{profile.email}</div>}
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-2">
        {item('/joc/oic/dashboard', 'Home')}
        {item('/joc/oic/application', 'Applications')}
        {item('/joc/oic/applicants', 'Applicants')}
        {item('/joc/oic/records', 'Records')}
        {item('/joc/oic/reports', 'Reports')}
        {item('/joc/oic/profile', 'Profile')}
      </nav>

      <div className="mt-auto pt-6">
        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </aside>
  )
}
