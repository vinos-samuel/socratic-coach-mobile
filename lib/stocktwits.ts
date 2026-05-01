// StockTwits public stream — no auth required, 200 req/hour unauthenticated.
// Returns bullish/bearish ratio from the last 30 messages that have a sentiment tag.
// Crypto tickers are automatically converted (BTC → BTC.X).

export interface StockTwitsSentiment {
  bullishPct: number;  // 0–100, computed from tagged messages only
  bearishPct: number;
  total: number;       // count of messages that had a sentiment tag
}

type StockTwitsMessage = {
  entities?: {
    sentiment?: { basic?: string } | null;
  } | null;
};

type StockTwitsResponse = {
  response?: { status: number };
  messages?: StockTwitsMessage[];
};

// Crypto tickers on StockTwits use the ".X" suffix convention.
function toStockTwitsSymbol(ticker: string): string {
  const CRYPTO = new Set(["BTC", "ETH", "SOL", "XRP", "AVAX", "LINK", "DOGE", "ADA", "MATIC", "DOT"]);
  return CRYPTO.has(ticker) ? `${ticker}.X` : ticker;
}

export async function getStockTwitsSentiment(
  ticker: string
): Promise<StockTwitsSentiment | null> {
  const symbol = toStockTwitsSymbol(ticker);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch(
        `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`,
        {
          cache: "no-store",
          headers: { "User-Agent": "Mozilla/5.0 StockCur8d/1.0" },
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.warn(`StockTwits ${ticker}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json() as StockTwitsResponse;

    // Only require a messages array — don't fail on response.status variations
    if (!Array.isArray(data.messages) || data.messages.length === 0) return null;

    let bullish = 0;
    let bearish = 0;
    for (const msg of data.messages) {
      const basic = msg.entities?.sentiment?.basic;
      if (!basic) continue;
      // API returns "Bullish" / "Bearish" (capitalised) but guard both cases
      if (basic.toLowerCase() === "bullish") bullish++;
      else if (basic.toLowerCase() === "bearish") bearish++;
    }

    const total = bullish + bearish;
    if (total < 2) return null; // need at least 2 tagged messages for a meaningful ratio

    const bullishPct = Math.round((bullish / total) * 100);
    return { bullishPct, bearishPct: 100 - bullishPct, total };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("abort")) console.warn(`StockTwits ${ticker}:`, msg);
    return null;
  }
}
