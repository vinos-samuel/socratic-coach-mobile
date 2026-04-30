// Finnhub free tier: 60 req/min, ~15 min delayed for US stocks
// Used only on the detail page (1 call per view) — well within limits
// Sign up: https://finnhub.io  →  Dashboard → API key

export interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change from prev close
  dp: number;  // % change
  h: number;   // session high
  l: number;   // session low
  o: number;   // session open
  pc: number;  // previous close
  t: number;   // last trade timestamp (unix seconds)
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
    // c === 0 means no data returned (e.g. ticker not found)
    return data.c > 0 ? data : null;
  } catch {
    return null;
  }
}
