"use client";

import { useState } from "react";
import { initializeProgram, mintFirearm } from "@/lib/solana/client";

export default function SolanaTestPage() {
  const [msg, setMsg] = useState("");

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h2>Solana Test (Devnet)</h2>

      <button
        onClick={async () => {
          try {
            setMsg("Initializing...");
            const sig = await initializeProgram();
            setMsg(`Initialize tx: ${sig}`);
          } catch (e) {
            setMsg(String(e));
          }
        }}
      >
        Initialize
      </button>

      <div style={{ height: 12 }} />

      <button
        onClick={async () => {
          try {
            setMsg("Minting...");
            const now = Math.floor(Date.now() / 1000);
            const sig = await mintFirearm({
              serial: "ABC-123",
              make: "Glock",
              model: "19",
              caliber: "9mm",
              dateBroughtIn: now,
              ownerId: "NATID-0001",
            });
            setMsg(`Mint tx: ${sig}`);
          } catch (e) {
            setMsg(String(e));
          }
        }}
      >
        Mint Firearm
      </button>

      <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{msg}</pre>

      <p style={{ marginTop: 12 }}>
        Make sure Phantom is installed and set to <b>Devnet</b>.
      </p>
    </div>
  );
}
