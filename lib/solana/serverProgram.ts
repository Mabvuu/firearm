// firearm-system/lib/solana/serverProgram.ts
import * as anchor from '@coral-xyz/anchor'
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import idlJson from './idl/firearmregistry.json'
import { getConnection, getPlatformKeypair } from './platformWallet'

const PROGRAM_ID = new PublicKey(process.env.FIREARM_PROGRAM_ID || '')
const idl = idlJson as unknown as anchor.Idl

type TxLike = Transaction | VersionedTransaction
type WalletLike = {
  publicKey: PublicKey
  signTransaction: <T extends TxLike>(tx: T) => Promise<T>
  signAllTransactions: <T extends TxLike>(txs: T[]) => Promise<T[]>
}

function signOne<T extends TxLike>(kp = getPlatformKeypair(), tx: T): T {
  if (tx instanceof Transaction) {
    tx.partialSign(kp)
    return tx
  }
  tx.sign([kp])
  return tx
}

function makeWallet(): WalletLike {
  const kp = getPlatformKeypair()
  return {
    publicKey: kp.publicKey,
    signTransaction: async <T extends TxLike>(tx: T) => signOne(kp, tx),
    signAllTransactions: async <T extends TxLike>(txs: T[]) => txs.map((t) => signOne(kp, t)),
  }
}

export function getProvider() {
  const connection = getConnection()
  const wallet = makeWallet()
  // cast is safe: matches anchor Wallet runtime shape
  return new anchor.AnchorProvider(
    connection,
    wallet as unknown as anchor.Wallet,
    { commitment: 'confirmed' }
  )
}

type ProgramWithId = anchor.Program & { programId: PublicKey }

export function getProgram() {
  const provider = getProvider()
  anchor.setProvider(provider)

  // your anchor version expects (idl, provider)
  const program = new anchor.Program(idl, provider) as unknown as ProgramWithId
  program.programId = PROGRAM_ID

  return program
}

export function getProgramId() {
  return PROGRAM_ID
}
