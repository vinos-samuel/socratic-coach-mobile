import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.POLYGON_API_KEY;

  if (!key) {
    return NextResponse.json({ status: "error", issue: "POLYGON_API_KEY env var is missing in this deployment" });
  }

  // Step 1: test the simplest possible call — single ticker aggregate
  const testUrl = `https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2024-01-02/2024-01-05?adjusted=true&sort=asc&limit=5&apiKey=${key}`;
  let aggResult: { ok: boolean; status: number; body: unknown } = { ok: false, status: 0, body: null };
  try {
    const res = await fetch(testUrl, { cache: "no-store" });
    aggResult = { ok: res.ok, status: res.status, body: await res.json() };
  } catch (e) {
    aggResult = { ok: false, status: 0, body: String(e) };
  }

  // Step 2: test grouped daily endpoint
  const groupUrl = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/2024-01-04?adjusted=true&include_otc=false&apiKey=${key}`;
  let groupResult: { ok: boolean; status: number; count: number; error?: unknown } = { ok: false, status: 0, count: 0 };
  try {
    const res = await fetch(groupUrl, { cache: "no-store" });
    const json = await res.json() as { results?: unknown[]; error?: unknown };
    groupResult = { ok: res.ok, status: res.status, count: json.results?.length ?? 0, error: json.error };
  } catch (e) {
    groupResult = { ok: false, status: 0, count: 0, error: String(e) };
  }

  return NextResponse.json({
    keyPresent: true,
    keyPrefix: key.slice(0, 6) + "...",
    aggregatesTest: aggResult.ok ? "PASS" : `FAIL (HTTP ${aggResult.status})`,
    groupedDailyTest: groupResult.ok ? `PASS (${groupResult.count} tickers)` : `FAIL (HTTP ${groupResult.status}) — ${groupResult.error ?? ""}`,
    details: { aggResult, groupResult },
  });
}
