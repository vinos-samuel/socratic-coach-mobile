const BASE = "https://api.polygon.io";

function key() {
  const k = process.env.POLYGON_API_KEY;
  if (!k) throw new Error("POLYGON_API_KEY is not set");
  return k;
}

export interface PolygonBar {
  t: number; // timestamp ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface GroupedBar {
  T: string; // ticker
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw: number;
}

async function get<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 429) {
      // Rate limited — wait and retry
      await new Promise((r) => setTimeout(r, (attempt + 1) * 12000));
      continue;
    }
    if (!res.ok) throw new Error(`Polygon error ${res.status} on ${url.split("?")[0]}`);
    return res.json() as Promise<T>;
  }
  throw new Error("Polygon rate limit exceeded — consider upgrading to a paid plan");
}

// Returns previous trading day grouped bars for all US stocks (1 API call, free tier)
export async function getGroupedDailyBars(daysAgo = 1): Promise<GroupedBar[]> {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  // Skip weekends
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() - 1);
  const dateStr = date.toISOString().slice(0, 10);
  const url = `${BASE}/v2/aggs/grouped/locale/us/market/stocks/${dateStr}?adjusted=true&include_otc=false&apiKey=${key()}`;
  const data = await get<{ results: GroupedBar[] }>(url);
  return data.results ?? [];
}

export async function getDailyBars(ticker: string, days = 252): Promise<PolygonBar[]> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - Math.ceil(days * 1.5));
  const url = `${BASE}/v2/aggs/ticker/${ticker}/range/1/day/${from.toISOString().slice(0, 10)}/${to.toISOString().slice(0, 10)}?adjusted=true&sort=asc&limit=500&apiKey=${key()}`;
  const data = await get<{ results: PolygonBar[] }>(url);
  return (data.results ?? []).slice(-days);
}

export async function getTickerDetails(ticker: string): Promise<{ name: string }> {
  const url = `${BASE}/v3/reference/tickers/${ticker}?apiKey=${key()}`;
  const data = await get<{ results: { name: string } }>(url);
  return data.results ?? { name: ticker };
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hour = et.getHours();
  const min = et.getMinutes();
  const minutes = hour * 60 + min;
  return day >= 1 && day <= 5 && minutes >= 570 && minutes < 960;
}
