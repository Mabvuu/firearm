'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import NavPage from '../../nav/page'

export default function AddCompetencyRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.push('/police/firearmofficer/competency')
  }, [router])

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>
    </div>
  )
}
