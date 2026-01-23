"use client";

import { useState } from "react";

export default function ConnectButton() {
  const [addr, setAddr] = useState<string>("");

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={async () => {
          const w = window as unknown as { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }> } };
          if (!w.solana) {
            alert("Install Phantom wallet");
            return;
          }
          const res = await w.solana.connect();
          setAddr(res.publicKey.toString());
        }}
      >
        Connect Phantom
      </button>

      {addr ? (
        <div style={{ marginTop: 8, fontSize: 14 }}>
          Connected: <b>{addr}</b>
        </div>
      ) : null}
    </div>
  );
}
