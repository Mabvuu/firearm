// app/register/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { ROLES, Role } from '@/lib/roles'

export default function RegisterPage() {
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
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-[360px]">
        <CardHeader>
          <CardTitle>Register</CardTitle>
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

          <select
            className="w-full border rounded-md h-10 px-3"
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
          />

          <Button className="w-full" onClick={handleRegister} disabled={loading}>
            Register
          </Button>

          <div className="text-sm text-center">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
