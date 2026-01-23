// app/dealer/nav/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

type Profile = { role: string; email: string }

type SolWalletKey = 'phantom' | 'solflare' | 'backpack' | 'glow'

type SolanaProvider = {
  connect: () => Promise<unknown>
  publicKey?: { toString?: () => string; toBase58?: () => string } | string | null
}

type PhantomWindow = { solana?: SolanaProvider }
type BackpackWindow = { solana?: SolanaProvider }
type GlowWindow = { solana?: SolanaProvider }

type WindowWithSolanaWallets = Window & {
  phantom?: PhantomWindow
  solflare?: SolanaProvider
  backpack?: BackpackWindow
  glow?: GlowWindow
}

type WalletOption = {
  key: SolWalletKey
  name: string
  getProvider: () => SolanaProvider | null
}

const FIRST_TIME_GREETING = 'Hi — welcome'
const RETURNING_GREETINGS = [
  'Welcome back.',
  'Hey.',
  'Good to see you.',
  'Let’s continue.',
  'Ready when you are.',
  'Back again.',
  'Let’s move.',
  'Let’s do this.',
  'We keep going.',
  'Hey, welcome back.',
]

function pickNextGreeting(uid: string) {
  const greetedKey = `nav_greeted_${uid}`
  const lastIdxKey = `nav_greet_idx_${uid}`

  const greeted = localStorage.getItem(greetedKey) === '1'
  if (!greeted) {
    localStorage.setItem(greetedKey, '1')
    localStorage.setItem(lastIdxKey, '-1')
    return FIRST_TIME_GREETING
  }

  const lastIdx = Number(localStorage.getItem(lastIdxKey) ?? '-1')
  let idx = Math.floor(Math.random() * RETURNING_GREETINGS.length)
  if (RETURNING_GREETINGS.length > 1 && idx === lastIdx) idx = (idx + 1) % RETURNING_GREETINGS.length
  localStorage.setItem(lastIdxKey, String(idx))
  return RETURNING_GREETINGS[idx]
}

/** tiny inline icons (no deps) */
function WalletIcon({ name }: { name: SolWalletKey }) {
  if (name === 'phantom') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M12 2c5.5 0 10 4 10 9.5S17.5 22 12 22 2 17 2 11.5 6.5 2 12 2Z" fill="currentColor" opacity="0.16" />
        <path d="M7.2 15.2c1.8-1.7 7.8-1.7 9.6 0 .5.5.3 1.3-.4 1.5-2 .7-6.8.7-8.8 0-.7-.2-.9-1-.4-1.5Z" fill="currentColor" />
        <path d="M9 10.2c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1Zm6 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1Z" fill="currentColor" />
      </svg>
    )
  }
  if (name === 'solflare') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M4 6h14l2-2H6L4 6Zm0 14h14l2-2H6l-2 2Zm2-8h14l-2 2H4l2-2Z" fill="currentColor" />
      </svg>
    )
  }
  if (name === 'backpack') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M8 7a4 4 0 0 1 8 0v1h1a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-9a2 2 0 0 1 2-2h1V7Z" fill="currentColor" opacity="0.18" />
        <path d="M9 7a3 3 0 0 1 6 0v1H9V7Zm-1 6h8v2H8v-2Zm0 4h8v2H8v-2Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2Z" fill="currentColor" />
    </svg>
  )
}

export default function NavPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [greeting, setGreeting] = useState('')

  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletName, setWalletName] = useState<string | null>(null)
  const [showWalletPicker, setShowWalletPicker] = useState(false)

  const walletOptions: WalletOption[] = useMemo(
    () => [
      {
        key: 'phantom',
        name: 'Phantom',
        getProvider: () => {
          const w = window as unknown as WindowWithSolanaWallets
          return w.phantom?.solana ?? null
        },
      },
      {
        key: 'solflare',
        name: 'Solflare',
        getProvider: () => {
          const w = window as unknown as WindowWithSolanaWallets
          return w.solflare ?? null
        },
      },
      {
        key: 'backpack',
        name: 'Backpack',
        getProvider: () => {
          const w = window as unknown as WindowWithSolanaWallets
          return w.backpack?.solana ?? null
        },
      },
      {
        key: 'glow',
        name: 'Glow',
        getProvider: () => {
          const w = window as unknown as WindowWithSolanaWallets
          return w.glow?.solana ?? null
        },
      },
    ],
    []
  )

  const navLinks = useMemo(
    () => [
      { href: '/dealer/dashboard', label: 'Home' },
      { href: '/dealer/mint', label: 'Mint' },
      { href: '/dealer/application', label: 'Application' },
      { href: '/dealer/inventory', label: 'Inventory' },
      { href: '/dealer/audit', label: 'Audit' },
      { href: '/dealer/profile', label: 'Profile' },
    ],
    []
  )

  useEffect(() => {
    const init = async () => {
      const storedAddr = localStorage.getItem('registeredSolWallet')
      const storedName = localStorage.getItem('registeredSolWalletName')
      if (storedAddr) setWalletAddress(storedAddr)
      if (storedName) setWalletName(storedName)

      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes.user
      if (!user) {
        setMounted(true)
        router.replace('/login')
        return
      }

      setGreeting(pickNextGreeting(user.id))

      const { data: prof, error } = await supabase
        .from('profiles')
        .select('role,email')
        .eq('auth_uid', user.id)
        .maybeSingle()

      if (!error && prof?.email && prof?.role) setProfile({ email: prof.email, role: prof.role })
      else setProfile({ email: user.email ?? '', role: '' })

      setMounted(true)
    }

    setTimeout(() => void init(), 0)
  }, [router])

  const connectSolWallet = async (key: SolWalletKey) => {
    const opt = walletOptions.find((w) => w.key === key)
    if (!opt) return

    const provider = opt.getProvider()
    if (!provider) {
      alert(`${opt.name} not found. Install it first.`)
      return
    }

    try {
      await provider.connect()

      const pk = provider.publicKey
      const pubkey =
        typeof pk === 'string'
          ? pk
          : pk?.toBase58?.()
          ? pk.toBase58()
          : pk?.toString?.()
          ? pk.toString()
          : null

      if (!pubkey) {
        alert('Could not read wallet public key')
        return
      }

      localStorage.setItem('registeredSolWallet', pubkey)
      localStorage.setItem('registeredSolWalletName', opt.name)
      setWalletAddress(pubkey)
      setWalletName(opt.name)
      setShowWalletPicker(false)
    } catch (e) {
      console.error(e)
      alert('Wallet connection failed')
    }
  }

  const removeWallet = () => {
    localStorage.removeItem('registeredSolWallet')
    localStorage.removeItem('registeredSolWalletName')
    setWalletAddress(null)
    setWalletName(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    removeWallet()
    router.replace('/login')
  }

  const linkBtn = (href: string, label: string) => {
    const active = pathname === href
    return (
      <Link key={href} href={href}>
        <Button
          variant="ghost"
          className={[
            'w-full justify-start',
            active ? 'bg-[#2F4F6F]/15 text-[#1F2A35] font-semibold' : 'text-[#1F2A35]/90',
            'hover:bg-[#2F4F6F]/10 hover:text-[#1F2A35]',
          ].join(' ')}
        >
          <span
            className={[
              'mr-2 h-2 w-2 rounded-full',
              active ? 'bg-[#2F4F6F]' : 'bg-[#B5B5B3]',
            ].join(' ')}
          />
          {label}
        </Button>
      </Link>
    )
  }

  if (!mounted) {
    return (
      <aside className="h-full p-4 flex flex-col bg-[#F7F6F2]">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-black/10" />
          <div className="h-3 w-56 rounded bg-black/10" />
          <div className="h-3 w-44 rounded bg-black/10" />
        </div>
      </aside>
    )
  }

  return (
    <aside
      className={[
        // ✅ STICKY NAV (doesn't move while right side scrolls)
        'sticky top-0 h-screen',
        // layout
        'p-4 flex flex-col',
        // theme color
        'bg-[#F7F6F2]',
        'border-r border-black/10',
      ].join(' ')}
    >
      {/* Header panel */}
      <div className="mb-5 rounded-xl border border-black/10 bg-white p-3">
        <div className="text-base font-semibold text-[#1F2A35]">{greeting}</div>
        <div className="mt-1 text-xs text-[#1F2A35]/70">
          {profile?.role ? <span className="uppercase tracking-wide">{profile.role}</span> : <span>—</span>}
          {profile?.email ? <span> • {profile.email}</span> : null}
        </div>
        <div className="mt-3 h-1 w-full rounded-full bg-[#2F4F6F]/15">
          <div className="h-1 w-1/2 rounded-full bg-[#2F4F6F]" />
        </div>
      </div>

      {/* Wallet */}
      <div className="mb-5 rounded-xl border border-black/10 bg-white p-3">
        {!walletAddress ? (
          <div className="space-y-2">
            <Button
              onClick={() => setShowWalletPicker(true)}
              className="w-full text-white"
              style={{ backgroundColor: '#2F4F6F' }}
            >
              Add Solana Wallet
            </Button>

            <p className="text-xs text-[#B65A4A]">Please add your wallet</p>

            {showWalletPicker && (
              <div className="mt-2 rounded-md border border-black/10 bg-[#F7F6F2] p-2 space-y-1">
                {walletOptions.map((w) => {
                  const installed = !!w.getProvider()
                  return (
                    <button
                      key={w.key}
                      onClick={() => connectSolWallet(w.key)}
                      disabled={!installed}
                      className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-white/70 disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <span className="text-[#2F4F6F]">
                        <WalletIcon name={w.key} />
                      </span>

                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#1F2A35]">{w.name}</div>
                        <div className="text-xs text-[#1F2A35]/60">
                          {installed ? 'Detected' : 'Not installed'}
                        </div>
                      </div>

                      <span className="text-xs text-[#2F4F6F]">Connect</span>
                    </button>
                  )
                })}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-black/15 text-[#1F2A35]"
                  onClick={() => setShowWalletPicker(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-[#1F2A35]/70">
              Connected: <span className="font-medium text-[#1F2A35]">{walletName ?? 'Wallet'}</span>
            </div>
            <div className="text-xs font-mono break-all text-[#1F2A35]">{walletAddress}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={removeWallet}
              className="w-full border-black/15 text-[#1F2A35]"
            >
              Remove Wallet
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navLinks.map((l) => linkBtn(l.href, l.label))}
      </nav>

      {/* Logout */}
      <div className="mt-auto pt-6">
        <Button
          className="w-full text-white"
          style={{ backgroundColor: '#B65A4A' }}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </aside>
  )
}
