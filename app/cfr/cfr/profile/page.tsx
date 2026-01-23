'use client'

import { useEffect, useState } from 'react'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { PROVINCES } from '@/lib/provinces'
import { AccountDetails } from '@/lib/types/account-details'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function CfrProfilePage() {
  const [form, setForm] = useState<AccountDetails>({
    role: 'cfr',
    national_id: '',
    name: '',
    surname: '',
    province: '',
    city: '',
    contact_number: ''
  })

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return

      const res = await fetch('/api/account-details', {
        headers: { Authorization: `Bearer ${token}` }
      })

      const profile: AccountDetails | null = await res.json()
      if (profile) setForm(profile)
    }

    load()
  }, [])

  const save = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    await fetch('/api/account-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    })
  }

  return (
    <div className="flex min-h-screen">
      <NavPage />
      <div className="p-6 max-w-lg w-full">
        <Card>
          <CardHeader>
            <CardTitle>CFR Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="National ID" value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} />
            <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Surname" value={form.surname} onChange={e => setForm({ ...form, surname: e.target.value })} />

            <select className="w-full border rounded p-2" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })}>
              <option value="">Select province</option>
              {PROVINCES.map(p => <option key={p}>{p}</option>)}
            </select>

            <Input placeholder="City / Town" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            <Input placeholder="Contact Number" value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} />

            <Button onClick={save}>Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
