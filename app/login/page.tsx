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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4">

      <div className="w-full max-w-sm sm:max-w-md space-y-4">

        {/* Back Button - closer to card */}
        <Button
          variant="ghost"
          className="rounded-md px-3 text-sm"
          onClick={() => router.push('/')}
        >
          ← Back
        </Button>

        {/* Double Border Wrapper */}
        <div className="border-4 border-neutral-300 rounded-3xl p-[3px]">
          <div className="border border-neutral-300 rounded-3xl">

            <Card className="bg-white shadow-xl rounded-3xl border-0">
              <CardHeader className="text-center space-y-1 pt-8">
                <CardTitle className="text-2xl font-bold">
                  Welcome Back
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Secure access to your dashboard
                </p>
              </CardHeader>

              <CardContent className="space-y-4 pb-8 px-6 sm:px-8">
                <Input
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="rounded-lg h-11"
                />

                <Input
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="rounded-lg h-11"
                />

                <Button
                  className="w-full rounded-lg h-11 text-base"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Login'}
                </Button>

                <div className="text-sm text-center space-y-2 pt-2">
                  <Link href="/forgot" className="underline hover:text-indigo-600">
                    Forgot password?
                  </Link>

                  <div>
                    No account?{' '}
                    <Link href="/register" className="underline hover:text-indigo-600">
                      Register
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  )
}