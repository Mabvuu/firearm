'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-6">
      
      <div className="bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-10 w-full max-w-md text-center space-y-8">
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Digital Firearm License
          </h1>
          <p className="text-sm text-muted-foreground">
            Secure. Verifiable. Modern.
          </p>
        </div>

        <div className="space-y-4">
          <Link href="/login">
            <Button className="w-full rounded-xl text-base py-6 shadow-md">
              Login
            </Button>
          </Link>

          <Link href="/register">
            <Button
              variant="outline"
              className="w-full rounded-xl text-base py-6 border-2 hover:bg-neutral-100"
            >
              Register
            </Button>
          </Link>

          <Link href="/wallet">
            <Button
              variant="secondary"
              className="w-full rounded-xl text-base py-6 border border-indigo-200 hover:bg-indigo-50"
            >
              View Wallet
            </Button>
          </Link>
        </div>

        <div className="text-xs text-muted-foreground pt-4 border-t">
          Government Issued Digital License System
        </div>
      </div>
    </div>
  )
}