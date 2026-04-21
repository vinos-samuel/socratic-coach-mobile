import { NextResponse } from "next/server";
import { runStockScan } from "@/lib/scanner";
import { isMarketOpen } from "@/lib/polygon";
import { ScannerResponse } from "@/types";

export const revalidate = 300; // cache 5 minutes

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
    console.error("Scanner error:", error);
    return NextResponse.json(
      { error: "Scanner failed", picks: [], lastUpdated: new Date().toISOString(), marketOpen: false, nextScanIn: 300 },
      { status: 500 }
    );
  }
}
