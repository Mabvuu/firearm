import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4">
        <Link href="/login">
          <Button className="w-48">Login</Button>
        </Link>

        <Link href="/register">
          <Button variant="outline" className="w-48">
            Register
          </Button>
        </Link>
      </div>
    </div>
  )
}
