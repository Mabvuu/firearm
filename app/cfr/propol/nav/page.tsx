// app/cfr/propol/nav/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

const FIRST_TIME_GREETING = 'Hi, welcome.'
const RETURNING_GREETINGS = [
  'Welcome back.',
  'Hi again.',
  'Hello.',
  'Hey.',
  'Good to see you.',
  'How are you today?.',
  'Hi there.',
  'Hello again.',
]

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
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace('/login')
        return
      }

      setGreeting(pickGreeting(data.user.id))
      setEmail(data.user.email ?? null)
      setMounted(true)
    }

    setTimeout(() => void init(), 0)
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="h-full p-4 flex flex-col sticky top-0 self-start">
      {/* Header */}
      <div className="mb-6 space-y-1">
        {!mounted ? (
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-4 w-48 rounded bg-muted" />
          </div>
        ) : (
          <>
            <div className="text-base font-semibold">{greeting}</div>
            <div className="text-lg font-semibold tracking-wide text-neutral-700">
              PROVINCE POLICE
            </div>
            {email && (
              <div className="text-xs text-muted-foreground">{email}</div>
            )}
          </>
        )}
      </div>

      <nav className="flex flex-col gap-2">
        <Link href="/cfr/propol/dashboard"><Button variant="ghost" className="w-full justify-start">Home</Button></Link>
        <Link href="/cfr/propol/application"><Button variant="ghost" className="w-full justify-start">Application</Button></Link>
        <Link href="/cfr/propol/applicants"><Button variant="ghost" className="w-full justify-start">Applicants</Button></Link>
        <Link href="/cfr/propol/audit"><Button variant="ghost" className="w-full justify-start">Audit</Button></Link>
        <Link href="/cfr/propol/profile"><Button variant="ghost" className="w-full justify-start">Profile</Button></Link>
      </nav>

      <div className="mt-auto pt-6">
        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </aside>
  )
}
