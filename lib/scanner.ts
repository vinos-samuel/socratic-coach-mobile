import { MomentumPick, OHLCVBar } from "@/types";
import { getDailyBars, getTickerDetails, PolygonBar } from "./polygon";
import { getCoinbaseDailyCandles, TOP_CRYPTO_PAIRS } from "./coinbase";
import { scoreBars } from "./scoring";

// Curated high-momentum S&P 500 candidates — all accessible via individual aggregate calls
// (free tier compatible: no grouped daily, no bulk snapshot needed)
const SCAN_UNIVERSE = [
  // Mega-cap tech / high-beta
  "NVDA", "AMD", "AAPL", "MSFT", "META", "GOOGL", "AMZN", "TSLA", "AVGO", "ORCL",
  // Growth / cloud
  "CRM", "ADBE", "NOW", "PANW", "CRWD", "SNPS", "CDNS", "KLAC", "LRCX", "AMAT",
  // Financials
  "JPM", "GS", "MS", "V", "MA",
  // Healthcare / biotech
  "LLY", "ABBV", "ISRG", "VRTX", "REGN",
  // Energy / industrials
  "XOM", "CVX", "CAT", "DE", "ETN",
];

function polygonToOHLCV(bar: PolygonBar): OHLCVBar {
  return {
    time: Math.floor(bar.t / 1000),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  };
}

export async function runStockScan(limit = 10): Promise<MomentumPick[]> {
  // Fetch SPY baseline first (needed for RS Rating)
  const spyRaw = await getDailyBars("SPY", 252);
  const spyBars = spyRaw.map(polygonToOHLCV);
  if (spyBars.length < 55) throw new Error("Could not fetch SPY baseline data");

  const results: MomentumPick[] = [];

  // Fetch all candidates in parallel — individual aggregate calls work on free tier
  await Promise.allSettled(
    SCAN_UNIVERSE.map(async (ticker) => {
      try {
        const rawBars = await getDailyBars(ticker, 252);
        const bars = rawBars.map(polygonToOHLCV);
        const scored = scoreBars(bars, spyBars, ticker, ticker);
        if (!scored || scored.score < 55) return;

        const lastBar = bars[bars.length - 1];
        const prevBar = bars[bars.length - 2];
        const price = lastBar.close;
        const change = price - (prevBar?.close ?? price);
        const changePct = prevBar ? (change / prevBar.close) * 100 : 0;

        results.push({
          ticker,
          name: ticker,
          price: +price.toFixed(2),
          change: +change.toFixed(2),
          changePct: +changePct.toFixed(2),
          score: scored.score,
          rsRating: scored.rsRating,
          volumeRatio: scored.volumeRatio,
          rsi: scored.rsi,
          emaStack: scored.emaStack,
          emaCross921: scored.emaCross921,
          aboveVwap: scored.aboveVwap,
          sparkline: bars.slice(-30).map((b) => b.close),
          tradeSetup: scored.tradeSetup,
          signals: scored.signals,
          ruleBasedCommentary: scored.ruleBasedCommentary,
          type: "stock",
        });
      } catch {
        // skip tickers that fail
      }
    })
  );

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, limit);

  // Enrich top picks with real company names
  await Promise.allSettled(
    top.map(async (pick) => {
      try {
        const details = await getTickerDetails(pick.ticker);
        pick.name = details.name;
      } catch {
        // keep ticker as name
      }
    })
  );

  return top;
}

export async function runCryptoScan(limit = 6): Promise<MomentumPick[]> {
  const results: MomentumPick[] = [];

  await Promise.allSettled(
    TOP_CRYPTO_PAIRS.map(async ({ productId, name }) => {
      try {
        const candles = await getCoinbaseDailyCandles(productId, 100);
        if (candles.length < 55) return;

        const scored = scoreBars(candles, candles, productId, name);
        if (!scored || scored.score < 50) return;

        const price = candles[candles.length - 1].close;
        const prevPrice = candles[candles.length - 2]?.close ?? price;
        const change = price - prevPrice;
        const changePct = (change / prevPrice) * 100;

        results.push({
          ticker: productId.replace("-USD", ""),
          name,
          price,
          change,
          changePct,
          score: scored.score,
          rsRating: scored.rsRating,
          volumeRatio: scored.volumeRatio,
          rsi: scored.rsi,
          emaStack: scored.emaStack,
          emaCross921: scored.emaCross921,
          aboveVwap: scored.aboveVwap,
          sparkline: candles.slice(-30).map((b) => b.close),
          tradeSetup: scored.tradeSetup,
          signals: scored.signals,
          ruleBasedCommentary: scored.ruleBasedCommentary,
          type: "crypto",
        });
      } catch {
        // skip
      }
    })
  );

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
