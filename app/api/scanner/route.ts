import { NextResponse } from "next/server";
import { runStockScan } from "@/lib/scanner";
import { isMarketOpen } from "@/lib/polygon";
import { ScannerResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const picks = await runStockScan(10);
    const marketOpen = isMarketOpen();
    const response: ScannerResponse = {
      picks,
      lastUpdated: new Date().toISOString(),
      marketOpen,
      nextScanIn: 300,
    };
    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Scanner error:", msg);
    return NextResponse.json(
      { error: msg, picks: [], lastUpdated: new Date().toISOString(), marketOpen: false, nextScanIn: 300 },
      { status: 500 }
    );
  }
}
