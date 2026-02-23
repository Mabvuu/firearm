'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function BlacklistNavLink() {
  return (
    <Link href="/blacklist">
      <Button variant="outline" className="w-full justify-start">
        Blacklist
      </Button>
    </Link>
  )
}