import fs from 'fs'
import path from 'path'
import { Keypair, Connection } from '@solana/web3.js'

let cachedKeypair: Keypair | null = null
let cachedConnection: Connection | null = null

function resolveKeypairPath(p: string) {
  // if user passes "keys/xxx.json" we treat it relative to this folder's parent
  // your file is: lib/solana/keys/platform-devnet.json
  // so p="keys/platform-devnet.json" should resolve correctly
  return path.isAbsolute(p)
    ? p
    : path.resolve(process.cwd(), 'lib', 'solana', p)
}

export function getPlatformKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair

  const rel = (process.env.PLATFORM_WALLET_KEYPAIR_PATH || '').trim()
  if (!rel) {
    throw new Error('Missing PLATFORM_WALLET_KEYPAIR_PATH in .env.local')
  }

  const fullPath = resolveKeypairPath(rel)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Platform keypair file not found: ${fullPath}`)
  }

  const raw = fs.readFileSync(fullPath, 'utf8')
  const arr = JSON.parse(raw) as number[]
  if (!Array.isArray(arr) || arr.length < 64) {
    throw new Error('Invalid keypair JSON (expected array of 64 numbers)')
  }

  cachedKeypair = Keypair.fromSecretKey(Uint8Array.from(arr))
  return cachedKeypair
}

export function getConnection(): Connection {
  if (cachedConnection) return cachedConnection
  const url = (process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com').trim()
  cachedConnection = new Connection(url, 'confirmed')
  return cachedConnection
}
