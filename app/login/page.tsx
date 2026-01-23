'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'

const DASHBOARD_BY_ROLE: Record<string, string> = {
  dealer: '/dealer/dashboard',
  'police.firearmofficer': '/police/firearmofficer/dashboard',
  'police.oic': '/police/oic/dashboard',
  'cfr.cfr': '/cfr/cfr/dashboard',
  'cfr.dispol': '/cfr/dispol/dashboard',
  'cfr.propol': '/cfr/propol/dashboard',
  'joc.oic': '/joc/oic/dashboard',
  'joc.mid': '/joc/mid/dashboard',
  'joc.controller': '/joc/controller/dashboard'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !data.user) {
      setLoading(false)
      alert('Invalid email or password')
      return
    }

    // ✅ FIXED: use auth_uid, not id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_uid', data.user.id)
      .single()

    setLoading(false)

    if (profileError || !profile) {
      alert(profileError?.message || 'Profile not found')
      return
    }

    router.push(DASHBOARD_BY_ROLE[profile.role])
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[360px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            Login
          </Button>

          <div className="text-sm text-center space-y-1">
            <Link href="/forgot" className="underline">
              Forgot password?
            </Link>
            <div>
              No account?{' '}
              <Link href="/register" className="underline">
                Register
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
