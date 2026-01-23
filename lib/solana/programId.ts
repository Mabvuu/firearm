// firearm-system/lib/solana/programId.ts
import { clusterApiUrl } from "@solana/web3.js";

export const NETWORK =
  process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() || clusterApiUrl("devnet");

export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_FIREARM_PROGRAM_ID?.trim() || "";
