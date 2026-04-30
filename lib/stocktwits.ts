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
    sentiment?: { basic?: "Bullish" | "Bearish" } | null;
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
    const res = await fetch(
      `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`,
      {
        cache: "no-store",
        headers: { "User-Agent": "StockCur8d/1.0" },
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as StockTwitsResponse;
    if (data.response?.status !== 200 || !Array.isArray(data.messages)) return null;

    let bullish = 0;
    let bearish = 0;
    for (const msg of data.messages) {
      const basic = msg.entities?.sentiment?.basic;
      if (basic === "Bullish") bullish++;
      else if (basic === "Bearish") bearish++;
    }

    const total = bullish + bearish;
    if (total < 3) return null; // too few tagged messages to be meaningful

    const bullishPct = Math.round((bullish / total) * 100);
    return { bullishPct, bearishPct: 100 - bullishPct, total };
  } catch {
    return null;
  }
}
