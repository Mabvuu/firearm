'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Gun = {
  id: string
  serial: string
  created_at: string
}

export default function GunsPage() {
  const [guns, setGuns] = useState<Gun[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('guns')
        .select('id, serial, created_at')

      setGuns(data ?? [])
    }

    load()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">My Guns</h1>

      {guns.length === 0 && (
        <p>No records</p>
      )}

      {guns.map(gun => (
        <div key={gun.id}>
          {gun.serial}
        </div>
      ))}
    </div>
  )
}
