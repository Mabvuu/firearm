'use client'

import { useEffect, useState } from 'react'
import NavPage from '../nav/page'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PROVINCES } from '@/lib/provinces'
import { AccountDetails } from '@/lib/types/account-details'
import { supabase } from '@/lib/supabase/client'

export default function FirearmOfficerProfilePage() {
  const [form, setForm] = useState<AccountDetails>({
    role: 'police',
    national_id: '',
    name: '',
    surname: '',
    province: '',
    city: '',
    address: '',
    contact_number: '',
    badge_number: '',
    police_address: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (!token) return

      fetch('/api/account-details', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(d => d && setForm(d))
    })
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
            <CardTitle>Firearm Officer Profile</CardTitle>
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
            <Input placeholder="Police Address" value={form.police_address ?? ''} onChange={e => setForm({ ...form, police_address: e.target.value })} />
            <Input placeholder="Badge Number" value={form.badge_number ?? ''} onChange={e => setForm({ ...form, badge_number: e.target.value })} />
            <Input placeholder="Contact Number" value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} />

            <Button onClick={save}>Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
