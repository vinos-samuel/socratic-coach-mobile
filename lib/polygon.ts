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

export interface PolygonSnapshot {
  ticker: string;
  day: { c: number; o: number; h: number; l: number; v: number; vw: number };
  lastTrade: { p: number };
  prevDay: { c: number };
  todaysChangePerc: number;
  todaysChange: number;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Polygon error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export async function getSnapshot(ticker: string): Promise<PolygonSnapshot> {
  const url = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${key()}`;
  const data = await get<{ ticker: PolygonSnapshot }>(url);
  return data.ticker;
}

export async function getBulkSnapshots(tickers: string[]): Promise<PolygonSnapshot[]> {
  const batch = tickers.slice(0, 250).join(",");
  const url = `${BASE}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${batch}&apiKey=${key()}`;
  const data = await get<{ tickers: PolygonSnapshot[] }>(url);
  return data.tickers ?? [];
}

export async function getDailyBars(
  ticker: string,
  days = 252
): Promise<PolygonBar[]> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - Math.ceil(days * 1.5)); // extra days for weekends/holidays
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
  return day >= 1 && day <= 5 && minutes >= 570 && minutes < 960; // 9:30-16:00
}
