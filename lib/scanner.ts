import { MomentumPick, OHLCVBar } from "@/types";
import { getDailyBars, getGroupedDailyBars, getTickerDetails, PolygonBar } from "./polygon";
import { getCoinbaseDailyCandles, TOP_CRYPTO_PAIRS } from "./coinbase";
import { scoreBars } from "./scoring";
import { SP500_TICKERS } from "./sp500";

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

// Limit concurrency to avoid rate-limiting on free tier
async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit);
    const settled = await Promise.allSettled(batch.map((t) => t()));
    results.push(...settled);
  }
  return results;
}

export async function runStockScan(limit = 10): Promise<MomentumPick[]> {
  // 1. Get yesterday's grouped daily bars (1 API call — works on all Polygon tiers)
  let groupedBars = await getGroupedDailyBars(1);

  // If yesterday was a holiday (empty results), try 2 days ago
  if (!groupedBars.length) groupedBars = await getGroupedDailyBars(2);

  // 2. Filter to S&P 500 tickers in our list with decent price and volume
  const sp500Set = new Set(SP500_TICKERS);
  const candidates = groupedBars
    .filter((b) => sp500Set.has(b.T) && b.c > 10 && b.v > 1_000_000)
    .map((b) => ({
      ticker: b.T,
      price: b.c,
      change: b.c - b.o,
      changePct: ((b.c - b.o) / b.o) * 100,
      volume: b.v,
      // Sort by activity: high volume + positive move
      activityScore: b.v * Math.abs((b.c - b.o) / b.o),
    }))
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, 25); // process top 25 most active

  if (!candidates.length) return [];

  // 3. Fetch SPY baseline + all candidate histories concurrently (in batches of 5 for free tier safety)
  const spyRaw = await getDailyBars("SPY", 252);
  const spyBars = spyRaw.map(polygonToOHLCV);
  if (spyBars.length < 55) return [];

  const results: MomentumPick[] = [];

  const tasks = candidates.map((cand) => async () => {
    const rawBars = await getDailyBars(cand.ticker, 252);
    const bars = rawBars.map(polygonToOHLCV);
    const scored = scoreBars(bars, spyBars, cand.ticker, cand.ticker);
    if (!scored || scored.score < 55) return;

    const sparkline = bars.slice(-30).map((b) => b.close);
    results.push({
      ticker: cand.ticker,
      name: cand.ticker,
      price: +cand.price.toFixed(2),
      change: +cand.change.toFixed(2),
      changePct: +cand.changePct.toFixed(2),
      score: scored.score,
      rsRating: scored.rsRating,
      volumeRatio: scored.volumeRatio,
      rsi: scored.rsi,
      emaStack: scored.emaStack,
      emaCross921: scored.emaCross921,
      aboveVwap: scored.aboveVwap,
      sparkline,
      tradeSetup: scored.tradeSetup,
      signals: scored.signals,
      ruleBasedCommentary: scored.ruleBasedCommentary,
      type: "stock",
    });
  });

  // Batch of 5 concurrent requests — safe for free tier (5 req/min)
  await withConcurrency(tasks, 5);

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, limit);

  // Enrich top picks with full company names (small batch)
  await Promise.allSettled(
    top.slice(0, 5).map(async (pick) => {
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
        const sparkline = candles.slice(-30).map((b) => b.close);

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
          sparkline,
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
