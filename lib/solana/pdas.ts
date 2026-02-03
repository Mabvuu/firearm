import { PublicKey } from '@solana/web3.js'
import { getProgramId } from './serverProgram'

export function firearmPda(inventoryId: number | bigint) {
  const id = typeof inventoryId === 'bigint' ? inventoryId : BigInt(inventoryId)
  const seed = Buffer.alloc(8)
  seed.writeBigUInt64LE(id)

  return PublicKey.findProgramAddressSync(
    [Buffer.from('firearm'), seed],
    getProgramId()
  )
}
