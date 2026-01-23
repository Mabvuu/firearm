'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'

type GunRow = {
  serial: string
  make: string
  model: string
  caliber: string
  dateOfImport: string
}

export default function InventoryAddPage() {
  const router = useRouter()
  const [isBulk, setIsBulk] = useState(false)
  const [bulkCount, setBulkCount] = useState(1)

  const [guns, setGuns] = useState<GunRow[]>([
    { serial: '', make: '', model: '', caliber: '', dateOfImport: '' }
  ])

  const handleSingleChange = (field: keyof GunRow, value: string) => {
    setIsBulk(false)
    setBulkCount(1)
    setGuns([{ ...guns[0], [field]: value }])
  }

  const handleBulkCountChange = (count: number) => {
    setBulkCount(count)
    const firstGun = guns[0]
    const newGuns: GunRow[] = [
      { ...firstGun, serial: '' }
    ]

    for (let i = 1; i < count; i++) {
      newGuns.push({
        make: firstGun.make,
        model: firstGun.model,
        caliber: firstGun.caliber,
        dateOfImport: firstGun.dateOfImport,
        serial: ''
      })
    }

    setGuns(newGuns)
  }

  const handleGunChange = (index: number, field: keyof GunRow, value: string) => {
    const updated = [...guns]
    updated[index] = { ...updated[index], [field]: value }
    setGuns(updated)
  }

  const handleBulkInit = () => {
    setIsBulk(true)
    handleBulkCountChange(bulkCount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      guns.some(
        g =>
          !g.serial ||
          !g.make ||
          !g.model ||
          !g.caliber ||
          !g.dateOfImport
      )
    ) {
      alert('All fields including serial are required')
      return
    }

    const serials = guns.map(g => g.serial.trim())
    const uniqueSerials = new Set(serials)

    if (uniqueSerials.size !== serials.length) {
      alert('Serial numbers must be unique')
      return
    }

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      alert('Not logged in')
      return
    }

    const { error } = await supabase.from('inventory').insert(
      guns.map(g => ({
        serial: g.serial.trim(),
        make: g.make,
        model: g.model,
        caliber: g.caliber,
        date_of_import: g.dateOfImport,
        owner_id: user.id,
        minted: false
      }))
    )

    if (error) {
      console.error(error)
      alert('Failed to add inventory')
      return
    }

    router.push('/dealer/inventory')
  }

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-6">
        <button
          onClick={() => router.push('/dealer/inventory')}
          className="mb-4 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-4">Add Inventory</h1>

        <div className="mb-4 flex items-center gap-4">
          <label>
            <input
              type="radio"
              checked={!isBulk}
              onChange={() => setIsBulk(false)}
            />{' '}
            Single
          </label>
          <label>
            <input
              type="radio"
              checked={isBulk}
              onChange={handleBulkInit}
            />{' '}
            Bulk
          </label>

          {isBulk && (
            <input
              type="number"
              min={2}
              max={100}
              value={bulkCount}
              onChange={e => handleBulkCountChange(Number(e.target.value))}
              className="border rounded px-2 py-1 w-20"
            />
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <table className="w-full border-collapse border border-gray-300 mb-4">
            <thead>
              <tr>
                <th className="border p-2">#</th>
                <th className="border p-2">Make</th>
                <th className="border p-2">Model</th>
                <th className="border p-2">Caliber</th>
                <th className="border p-2">Date of Import</th>
                <th className="border p-2">Serial</th>
              </tr>
            </thead>
            <tbody>
              {guns.map((g, i) => (
                <tr key={i}>
                  <td className="border p-2 text-center">{i + 1}</td>

                  <td className="border p-2">
                    <input
                      className="w-full border px-2 py-1"
                      value={g.make}
                      onChange={e =>
                        isBulk
                          ? handleGunChange(i, 'make', e.target.value)
                          : handleSingleChange('make', e.target.value)
                      }
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      className="w-full border px-2 py-1"
                      value={g.model}
                      onChange={e =>
                        isBulk
                          ? handleGunChange(i, 'model', e.target.value)
                          : handleSingleChange('model', e.target.value)
                      }
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      className="w-full border px-2 py-1"
                      value={g.caliber}
                      onChange={e =>
                        isBulk
                          ? handleGunChange(i, 'caliber', e.target.value)
                          : handleSingleChange('caliber', e.target.value)
                      }
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      type="date"
                      className="w-full border px-2 py-1"
                      value={g.dateOfImport}
                      onChange={e =>
                        isBulk
                          ? handleGunChange(
                              i,
                              'dateOfImport',
                              e.target.value
                            )
                          : handleSingleChange(
                              'dateOfImport',
                              e.target.value
                            )
                      }
                    />
                  </td>

                  <td className="border p-2">
                    <input
                      className="w-full border px-2 py-1"
                      value={g.serial}
                      onChange={e =>
                        handleGunChange(i, 'serial', e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Add Inventory
          </button>
        </form>
      </div>
    </div>
  )
}
