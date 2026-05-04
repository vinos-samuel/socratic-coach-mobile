import { NextResponse } from "next/server";
import { runCryptoScan } from "@/lib/scanner";
import { MomentumPick, ScannerResponse } from "@/types";

export const dynamic = "force-dynamic";

let cryptoCache: { picks: MomentumPick[]; ts: number } | null = null;

export async function GET(req: Request) {
  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";
  const now = Date.now();
  // Crypto trades 24/7 — always use 10 min cache for fresh prices
  const CACHE_TTL = 10 * 60 * 1000;

  if (!forceRefresh && cryptoCache && now - cryptoCache.ts < CACHE_TTL) {
    const nextScanIn = Math.round((CACHE_TTL - (now - cryptoCache.ts)) / 1000);
    const response: ScannerResponse = {
      picks: cryptoCache.picks,
      lastUpdated: new Date(cryptoCache.ts).toISOString(),
      marketOpen: true,
      nextScanIn,
      scanLockedUntil: new Date(cryptoCache.ts + CACHE_TTL).toISOString(),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const picks = await runCryptoScan(6);
    cryptoCache = { picks, ts: now };
    const response: ScannerResponse = {
      picks,
      lastUpdated: new Date().toISOString(),
      marketOpen: true,
      nextScanIn: CACHE_TTL / 1000,
      scanLockedUntil: new Date(now + CACHE_TTL).toISOString(),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Crypto scanner error:", error);
    return NextResponse.json(
      { error: "Crypto scanner failed", picks: [], lastUpdated: new Date().toISOString(), marketOpen: true, nextScanIn: 300, scanLockedUntil: new Date().toISOString() },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
