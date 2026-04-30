// Finnhub free tier: 60 req/min, ~15 min delayed for US stocks
// Sign up: https://finnhub.io  →  Dashboard → API key

import { OHLCVBar } from "@/types";

export interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change from prev close
  dp: number;  // % change
  h: number;   // session high
  l: number;   // session low
  o: number;   // session open
  pc: number;  // previous close
  t: number;   // last trade timestamp (unix seconds)
  v?: number;  // optional: intraday volume (provided by Polygon snapshot, not Finnhub /quote)
}

export async function getFinnhubQuote(ticker: string): Promise<FinnhubQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json() as FinnhubQuote;
    return data.c > 0 ? data : null;
  } catch {
    return null;
  }
}

function toDateStr(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

// Splice today's Finnhub OHLC into the bar array so the full indicator +
// scoring pipeline sees current price action, not yesterday's EOD close.
// Returns the original array unchanged if quote is null or stale.
export function enrichBarsWithToday(bars: OHLCVBar[], quote: FinnhubQuote | null): OHLCVBar[] {
  if (!quote || quote.c <= 0 || quote.o <= 0 || quote.t <= 0) return bars;

  const quoteDate = toDateStr(quote.t);
  const lastBarDate = toDateStr(bars[bars.length - 1].time);

  if (quoteDate > lastBarDate) {
    // Today's session is not in Polygon yet — append a synthetic bar
    const syntheticTime = Math.floor(new Date(quoteDate + "T00:00:00.000Z").getTime() / 1000);
    return [...bars, {
      time: syntheticTime,
      open: quote.o,
      high: quote.h,
      low: quote.l,
      close: quote.c,
      volume: quote.v ?? 0,
    }];
  }

  if (quoteDate === lastBarDate) {
    // Same session — update the last bar with fresher intraday data
    const last = bars[bars.length - 1];
    return [...bars.slice(0, -1), {
      ...last,
      high: Math.max(last.high, quote.h),
      low: Math.min(last.low, quote.l),
      close: quote.c,
    }];
  }

  return bars;
}

// Returns count of articles in the last `hoursBack` hours plus the latest headline.
// Returns null if no API key, request fails, or no articles found.
export async function getFinnhubNews(
  ticker: string,
  hoursBack = 48
): Promise<{ count: number; latest: string | null } | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  try {
    const to = new Date();
    const from = new Date(to.getTime() - hoursBack * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const articles = await res.json() as Array<{ headline: string; datetime: number }>;
    if (!Array.isArray(articles) || articles.length === 0) return null;
    // Sort descending by datetime so articles[0] is the most recent
    articles.sort((a, b) => b.datetime - a.datetime);
    return { count: articles.length, latest: articles[0]?.headline ?? null };
  } catch {
    return null;
  }
}
