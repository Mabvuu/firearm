'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { PROVINCES } from '@/lib/provinces'
import { AccountDetails } from '@/lib/types/account-details'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const EMPTY_FORM: AccountDetails = {
  role: 'dealer',
  national_id: '',
  name: '',
  surname: '',
  province: '',
  city: '',
  address: '',
  contact_number: '',
  dealer_license_id: ''
}

export default function DealerProfilePage() {
  const [form, setForm] = useState<AccountDetails>(EMPTY_FORM)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return

      const res = await fetch('/api/account-details', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) return

      const profile = (await res.json()) as AccountDetails | null
      if (!profile) return

      setLocked(true)

      setForm({
        role: 'dealer',
        national_id: profile.national_id ?? '',
        name: profile.name ?? '',
        surname: profile.surname ?? '',
        province: profile.province ?? '',
        city: profile.city ?? '',
        address: profile.address ?? '',
        contact_number: profile.contact_number ?? '',
        dealer_license_id: profile.dealer_license_id ?? ''
      })
    }

    load()
  }, [])

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
  }

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

    setLocked(true)
  }

  return (
    <div className="flex min-h-screen">
      <NavPage />

      <div className="p-6 max-w-lg w-full">
        <Card>
          <CardHeader>
            <CardTitle>Dealer Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <Input name="national_id" value={form.national_id} onChange={onChange} disabled={locked} />
            <Input name="name" value={form.name} onChange={onChange} disabled={locked} />
            <Input name="surname" value={form.surname} onChange={onChange} disabled={locked} />

            <select
              name="province"
              className="w-full border rounded p-2"
              value={form.province}
              onChange={onChange}
            >
              <option value="">Select province</option>
              {PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <Input name="city" value={form.city} onChange={onChange} />
            <Input name="address" value={form.address} onChange={onChange} />
            <Input name="contact_number" value={form.contact_number} onChange={onChange} />
            <Input name="dealer_license_id" value={form.dealer_license_id} onChange={onChange} />

            <Button onClick={save}>Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
