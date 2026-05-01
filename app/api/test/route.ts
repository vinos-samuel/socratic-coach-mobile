import { NextResponse } from "next/server";
import { getFinnhubNews } from "@/lib/finnhub";
import { getStockTwitsSentiment } from "@/lib/stocktwits";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker") ?? "NVDA";
  const polygonKey = process.env.POLYGON_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  // --- Polygon key check ---
  let polygonTest: { result: string; status?: number } = { result: "skipped — key missing" };
  if (polygonKey) {
    const testUrl = `https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2024-01-02/2024-01-05?adjusted=true&sort=asc&limit=5&apiKey=${polygonKey}`;
    try {
      const res = await fetch(testUrl, { cache: "no-store" });
      polygonTest = { result: res.ok ? "PASS" : `FAIL`, status: res.status };
    } catch (e) {
      polygonTest = { result: `ERROR: ${String(e)}` };
    }
  }

  // --- Finnhub news ---
  let newsResult: unknown = "skipped — FINNHUB_API_KEY not set in Vercel env";
  if (finnhubKey) {
    try {
      newsResult = await getFinnhubNews(ticker, 48) ?? "null (no articles in 48h or request failed)";
    } catch (e) {
      newsResult = `ERROR: ${String(e)}`;
    }
  }

  // --- StockTwits sentiment (raw response logged alongside parsed result) ---
  let stockTwitsRaw: unknown = null;
  let stockTwitsParsed: unknown = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let stRes: Response;
    try {
      stRes = await fetch(
        `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`,
        { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 StockCur8d/1.0" }, signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }
    if (stRes.ok) {
      const json = await stRes.json() as {
        response?: { status: number };
        messages?: Array<{ entities?: { sentiment?: { basic?: string } | null } | null }>;
      };
      const messages = json.messages ?? [];
      const tagged = messages.map((m) => m.entities?.sentiment?.basic ?? null).filter(Boolean);
      stockTwitsRaw = {
        httpStatus: stRes.status,
        responseStatus: json.response?.status,
        totalMessages: messages.length,
        taggedMessages: tagged.length,
        taggedValues: tagged,
      };
      stockTwitsParsed = await getStockTwitsSentiment(ticker);
    } else {
      stockTwitsRaw = { httpStatus: stRes.status, error: "HTTP error" };
    }
  } catch (e) {
    stockTwitsRaw = { error: String(e) };
  }

  return NextResponse.json({
    ticker,
    env: {
      POLYGON_API_KEY: polygonKey ? `set (${polygonKey.length} chars)` : "MISSING — scans will fail",
      FINNHUB_API_KEY: finnhubKey ? `set (${finnhubKey.length} chars)` : "NOT SET — news chips will never show",
    },
    polygonTest,
    finnhubNews: newsResult,
    stockTwits: {
      raw: stockTwitsRaw,
      parsed: stockTwitsParsed,
      note: "parsed is null if totalMessages < 2 or no sentiment tags found",
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
