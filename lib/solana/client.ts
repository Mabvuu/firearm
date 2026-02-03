"use client";

type MintInput = {
  inventory_id: number;
  dealer_id: string;
};

export async function mintFirearm(input: MintInput) {
  const res = await fetch("/api/dealer/mint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Mint failed");
  }

  return data;
}
