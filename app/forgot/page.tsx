'use client'

import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')

  async function reset() {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/reset'
    })
  }

  return (
    <div className="p-10 space-y-4">
      <Input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <Button onClick={reset}>Send reset link</Button>
    </div>
  )
}
