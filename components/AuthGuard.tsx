'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot']

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function check() {
      if (PUBLIC_ROUTES.includes(pathname)) return

      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.replace('/login')
      }
    }
    check()
  }, [pathname, router])

  return <>{children}</>
}
