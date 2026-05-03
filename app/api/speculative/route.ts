import { NextResponse } from "next/server";
import { runSpeculativeScan } from "@/lib/speculative";
import { isMarketOpen } from "@/lib/polygon";
import { MomentumPick, ScannerResponse } from "@/types";

export const dynamic = "force-dynamic";

const CACHE_TTL = 30 * 60 * 1000;
let speculativeCache: { picks: MomentumPick[]; ts: number } | null = null;

export async function GET(req: Request) {
  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";
  const now = Date.now();

  if (!forceRefresh && speculativeCache && now - speculativeCache.ts < CACHE_TTL) {
    const nextScanIn = Math.round((CACHE_TTL - (now - speculativeCache.ts)) / 1000);
    const response: ScannerResponse = {
      picks: speculativeCache.picks,
      lastUpdated: new Date(speculativeCache.ts).toISOString(),
      marketOpen: isMarketOpen(),
      nextScanIn,
      scanLockedUntil: new Date(speculativeCache.ts + CACHE_TTL).toISOString(),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const picks = await runSpeculativeScan(10);
    speculativeCache = { picks, ts: now };
    const response: ScannerResponse = {
      picks,
      lastUpdated: new Date().toISOString(),
      marketOpen: isMarketOpen(),
      nextScanIn: CACHE_TTL / 1000,
      scanLockedUntil: new Date(now + CACHE_TTL).toISOString(),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Speculative scanner error:", msg);
    return NextResponse.json(
      { error: msg, picks: [], lastUpdated: new Date().toISOString(), marketOpen: false, nextScanIn: 300, scanLockedUntil: new Date().toISOString() },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
