// firearm-system/lib/solana/client.ts
"use client";

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { PROGRAM_ID, NETWORK } from "./programId";

type PublicKeyLike = { toString: () => string };

type InjectedSolanaProvider = {
  publicKey?: PublicKeyLike | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKeyLike }>;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
};

type WindowWithSolana = Window & {
  solana?: InjectedSolanaProvider;
  phantom?: { solana?: InjectedSolanaProvider };
  solflare?: InjectedSolanaProvider;
  backpack?: InjectedSolanaProvider;
};

// ------------------ helpers ------------------

function assertEnv() {
  const pid = (PROGRAM_ID || "").trim();
  if (!pid) throw new Error("Missing NEXT_PUBLIC_FIREARM_PROGRAM_ID in .env.local");
  if (pid.length < 32) throw new Error(`Invalid program id: "${pid}"`);
  if (!(NETWORK || "").trim()) throw new Error("Missing NEXT_PUBLIC_SOLANA_RPC");
}

function getInjectedProvider(): InjectedSolanaProvider {
  const w = window as unknown as WindowWithSolana;
  const provider =
    w.phantom?.solana ??
    w.solflare ??
    w.backpack ??
    w.solana;

  if (!provider) throw new Error("No Solana wallet found (Phantom/Solflare/Backpack)");
  return provider;
}

function getPublicKey(provider: InjectedSolanaProvider): PublicKey {
  const pk = provider.publicKey;
  if (!pk) throw new Error("Wallet not connected");
  return new PublicKey(pk.toString());
}

function getConnection() {
  assertEnv();
  return new Connection(NETWORK, "confirmed");
}

function configPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId)[0];
}

function firearmPda(programId: PublicKey, tokenIdU64: bigint) {
  const le8 = Buffer.alloc(8);
  le8.writeBigUInt64LE(tokenIdU64, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("firearm"), le8],
    programId
  )[0];
}

function u32LE(n: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

function i64LE(n: number) {
  // number -> bigint
  const bi = BigInt(Math.trunc(n));
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(bi, 0);
  return b;
}

function stringBorsh(s: string) {
  const bytes = Buffer.from(s, "utf8");
  return Buffer.concat([u32LE(bytes.length), bytes]);
}

async function discriminator(globalName: string) {
  // Anchor: first 8 bytes of sha256("global:<name>")
  const msg = new TextEncoder().encode(`global:${globalName}`);
  const hash = await crypto.subtle.digest("SHA-256", msg);
  return Buffer.from(hash).subarray(0, 8);
}

async function buildInitializeIx(args: {
  programId: PublicKey;
  authority: PublicKey;
  config: PublicKey;
}) {
  // Try snake_case then camel (in case your program used camel)
  const d1 = await discriminator("initialize");
  const data = Buffer.from(d1); // no args

  return new TransactionInstruction({
    programId: args.programId,
    keys: [
      { pubkey: args.authority, isSigner: true, isWritable: true },
      { pubkey: args.config, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildMintArgs(input: {
  serial: string;
  make: string;
  model: string;
  caliber: string;
  dateBroughtIn: number; // seconds
  ownerId: string;
}) {
  return Buffer.concat([
    stringBorsh(input.serial),
    stringBorsh(input.make),
    stringBorsh(input.model),
    stringBorsh(input.caliber),
    i64LE(input.dateBroughtIn),
    stringBorsh(input.ownerId),
  ]);
}

async function buildMintIx(args: {
  programId: PublicKey;
  authority: PublicKey;
  config: PublicKey;
  firearm: PublicKey;
  input: {
    serial: string;
    make: string;
    model: string;
    caliber: string;
    dateBroughtIn: number;
    ownerId: string;
  };
}) {
  // Anchor usually uses snake_case for discriminator names:
  // mintFirearm in IDL -> mint_firearm on-chain
  const snake = await discriminator("mint_firearm");
  const camel = await discriminator("mintFirearm");
  const argsBuf = buildMintArgs(args.input);

  const dataSnake = Buffer.concat([snake, argsBuf]);
  const dataCamel = Buffer.concat([camel, argsBuf]);

  const keys = [
    { pubkey: args.authority, isSigner: true, isWritable: true },
    { pubkey: args.config, isSigner: false, isWritable: true },
    { pubkey: args.firearm, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ] as const;

  const ixSnake = new TransactionInstruction({
    programId: args.programId,
    keys: [...keys],
    data: dataSnake,
  });

  const ixCamel = new TransactionInstruction({
    programId: args.programId,
    keys: [...keys],
    data: dataCamel,
  });

  return { ixSnake, ixCamel };
}

async function sendSignedTx(provider: InjectedSolanaProvider, tx: Transaction) {
  if (!provider.signTransaction) {
    throw new Error("Wallet must support signTransaction (use Phantom/Solflare/Backpack)");
  }

  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  const signed = await provider.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return sig;
}

async function fetchNextId(programId: PublicKey, config: PublicKey) {
  const connection = getConnection();
  const info = await connection.getAccountInfo(config, "confirmed");
  if (!info?.data) {
    throw new Error("Config not initialized yet (run initialize first)");
  }

  // Anchor account layout: 8-byte discriminator + fields
  // Config: owner Pubkey (32) + nextId u64 (8)
  // nextId offset = 8 + 32 = 40
  if (info.data.length < 48) {
    throw new Error("Config account data too small (wrong program/config PDA?)");
  }

  const nextId = info.data.readBigUInt64LE(40);
  return nextId;
}

// ------------------ exported API ------------------

export async function initializeProgram() {
  assertEnv();
  const injected = getInjectedProvider();
  if (!injected.publicKey) await injected.connect();

  const authority = getPublicKey(injected);
  const programId = new PublicKey((PROGRAM_ID || "").trim());
  const config = configPda(programId);

  const ix = await buildInitializeIx({ programId, authority, config });

  const tx = new Transaction().add(ix);
  tx.feePayer = authority;

  return sendSignedTx(injected, tx);
}

export async function mintFirearm(input: {
  serial: string;
  make: string;
  model: string;
  caliber: string;
  dateBroughtIn: number; // seconds
  ownerId: string;
}) {
  assertEnv();
  const injected = getInjectedProvider();
  if (!injected.publicKey) await injected.connect();

  const authority = getPublicKey(injected);
  const programId = new PublicKey((PROGRAM_ID || "").trim());
  const config = configPda(programId);

  const nextId = await fetchNextId(programId, config);
  const firearm = firearmPda(programId, nextId);

  const { ixSnake, ixCamel } = await buildMintIx({
    programId,
    authority,
    config,
    firearm,
    input,
  });

  // ✅ Try snake_case first, if it fails try camelCase
  try {
    const tx1 = new Transaction().add(ixSnake);
    tx1.feePayer = authority;
    return await sendSignedTx(injected, tx1);
  } catch (e1) {
    const msg1 = e1 instanceof Error ? e1.message : String(e1);
    // Try alternative discriminator
    try {
      const tx2 = new Transaction().add(ixCamel);
      tx2.feePayer = authority;
      return await sendSignedTx(injected, tx2);
    } catch (e2) {
      const msg2 = e2 instanceof Error ? e2.message : String(e2);
      throw new Error(`Mint failed.\nFirst attempt: ${msg1}\nSecond attempt: ${msg2}`);
    }
  }
}
