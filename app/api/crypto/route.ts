import { NextResponse } from "next/server";
import { runCryptoScan } from "@/lib/scanner";
import { ScannerResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const picks = await runCryptoScan(6);
    const response: ScannerResponse = {
      picks,
      lastUpdated: new Date().toISOString(),
      marketOpen: true, // crypto trades 24/7
      nextScanIn: 300,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Crypto scanner error:", error);
    return NextResponse.json(
      { error: "Crypto scanner failed", picks: [], lastUpdated: new Date().toISOString(), marketOpen: true, nextScanIn: 300 },
      { status: 500 }
    );
  }
}
