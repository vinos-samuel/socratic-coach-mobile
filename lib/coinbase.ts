const BASE = "https://api.exchange.coinbase.com";

export interface CoinbaseCandle {
  time: number; // unix timestamp seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CoinbaseTicker {
  product_id: string;
  price: string;
  price_percentage_change_24h: string;
  volume_24h: string;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "MomentumScout/1.0" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Coinbase error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export async function getCoinbaseDailyCandles(
  productId: string,
  days = 100
): Promise<CoinbaseCandle[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 86400;
  const url = `${BASE}/products/${productId}/candles?start=${start}&end=${end}&granularity=86400`;
  const raw = await get<number[][]>(url);
  return raw
    .map(([t, l, h, o, c, v]) => ({ time: t, open: o, high: h, low: l, close: c, volume: v }))
    .sort((a, b) => a.time - b.time);
}

// 4-hour candles — more signals than daily, max 300 per call (50 days @ 6/day = 300)
export async function getCoinbase4hrCandles(
  productId: string,
  days = 50
): Promise<CoinbaseCandle[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - Math.min(days, 50) * 86400; // Coinbase caps at 300 candles
  const url = `${BASE}/products/${productId}/candles?start=${start}&end=${end}&granularity=14400`;
  const raw = await get<number[][]>(url);
  return raw
    .map(([t, l, h, o, c, v]) => ({ time: t, open: o, high: h, low: l, close: c, volume: v }))
    .sort((a, b) => a.time - b.time);
}

export const TOP_CRYPTO_PAIRS = [
  { productId: "BTC-USD", name: "Bitcoin" },
  { productId: "ETH-USD", name: "Ethereum" },
  { productId: "SOL-USD", name: "Solana" },
  { productId: "XRP-USD", name: "XRP" },
  { productId: "AVAX-USD", name: "Avalanche" },
  { productId: "LINK-USD", name: "Chainlink" },
  { productId: "DOGE-USD", name: "Dogecoin" },
  { productId: "ADA-USD", name: "Cardano" },
  { productId: "MATIC-USD", name: "Polygon" },
  { productId: "DOT-USD", name: "Polkadot" },
  { productId: "LTC-USD", name: "Litecoin" },
  { productId: "ATOM-USD", name: "Cosmos" },
  { productId: "NEAR-USD", name: "NEAR Protocol" },
  { productId: "UNI-USD", name: "Uniswap" },
  { productId: "AAVE-USD", name: "Aave" },
  { productId: "OP-USD", name: "Optimism" },
  { productId: "SUI-USD", name: "Sui" },
  { productId: "APT-USD", name: "Aptos" },
  { productId: "INJ-USD", name: "Injective" },
  { productId: "RENDER-USD", name: "Render" },
  { productId: "FIL-USD", name: "Filecoin" },
  { productId: "ICP-USD", name: "Internet Computer" },
];
