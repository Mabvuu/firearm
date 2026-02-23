'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { ROLES, Role } from '@/lib/roles'

export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('dealer')
  const [nationalId, setNationalId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    setLoading(true)

    const res = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        role,
        national_id: nationalId
      })
    })

    setLoading(false)

    if (!res.ok) {
      toast.error('Registration failed')
      return
    }

    toast.success(
      'Registration successful. Please confirm your email, then login.'
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4">

      <div className="w-full max-w-sm sm:max-w-md space-y-4">

        {/* Back Button */}
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
                  Create Account
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Register for system access
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

                <select
                  className="w-full border border-neutral-300 rounded-lg h-11 px-3"
                  value={role}
                  onChange={e => setRole(e.target.value as Role)}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <Input
                  placeholder="National ID (verification only)"
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value)}
                  className="rounded-lg h-11"
                />

                <Button
                  className="w-full rounded-lg h-11 text-base"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? 'Creating account…' : 'Register'}
                </Button>

                <div className="text-sm text-center pt-2">
                  Already have an account?{' '}
                  <Link href="/login" className="underline hover:text-indigo-600">
                    Login
                  </Link>
                </div>

              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  )
}