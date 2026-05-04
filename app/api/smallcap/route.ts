import { NextResponse } from "next/server";
import { runSmallCapScan } from "@/lib/scanner";
import { isMarketOpen } from "@/lib/polygon";
import { MomentumPick, ScannerResponse } from "@/types";

export const dynamic = "force-dynamic";

let smallCapCache: { picks: MomentumPick[]; ts: number } | null = null;

export async function GET(req: Request) {
  const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";
  const now = Date.now();
  const CACHE_TTL = isMarketOpen() ? 10 * 60 * 1000 : 60 * 60 * 1000;

  if (!forceRefresh && smallCapCache && now - smallCapCache.ts < CACHE_TTL) {
    const nextScanIn = Math.round((CACHE_TTL - (now - smallCapCache.ts)) / 1000);
    const response: ScannerResponse = {
      picks: smallCapCache.picks,
      lastUpdated: new Date(smallCapCache.ts).toISOString(),
      marketOpen: isMarketOpen(),
      nextScanIn,
      scanLockedUntil: new Date(smallCapCache.ts + CACHE_TTL).toISOString(),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const picks = await runSmallCapScan(10);
    smallCapCache = { picks, ts: now };
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
    console.error("Small cap scanner error:", msg);
    return NextResponse.json(
      { error: msg, picks: [], lastUpdated: new Date().toISOString(), marketOpen: false, nextScanIn: 300, scanLockedUntil: new Date().toISOString() },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
