import { MomentumPick, OHLCVBar } from "@/types";
import { getDailyBars, getBulkSnapshots, getTickerDetails, PolygonBar } from "./polygon";
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

export async function runStockScan(limit = 10): Promise<MomentumPick[]> {
  // 1. Fetch SPY bars first (needed for RS Rating baseline)
  const spyRaw = await getDailyBars("SPY", 252);
  const spyBars = spyRaw.map(polygonToOHLCV);
  if (spyBars.length < 55) return [];

  // 2. Bulk snapshot to pre-filter (price, volume, change)
  const snapshots = await getBulkSnapshots(SP500_TICKERS);
  const filtered = snapshots.filter(
    (s) =>
      s &&
      s.day &&
      s.lastTrade?.p > 10 &&
      s.day.v > 500_000 // minimum daily volume
  );

  // Sort by biggest gainers first to prioritize active names
  filtered.sort((a, b) => (b.todaysChangePerc ?? 0) - (a.todaysChangePerc ?? 0));
  const candidates = filtered.slice(0, 40); // process top 40 by activity

  const results: MomentumPick[] = [];

  await Promise.allSettled(
    candidates.map(async (snap) => {
      try {
        const rawBars = await getDailyBars(snap.ticker, 252);
        const bars = rawBars.map(polygonToOHLCV);
        const scored = scoreBars(bars, spyBars, snap.ticker, snap.ticker);
        if (!scored || scored.score < 55) return;

        const price = snap.lastTrade?.p ?? snap.day?.c ?? 0;
        const change = snap.todaysChange ?? 0;
        const changePct = snap.todaysChangePerc ?? 0;
        const sparkline = bars.slice(-30).map((b) => b.close);

        results.push({
          ticker: snap.ticker,
          name: snap.ticker, // name fetched separately for top picks only
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
          type: "stock",
        });
      } catch {
        // skip tickers that fail (delisted, no data, etc.)
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
        pick.ruleBasedCommentary = pick.ruleBasedCommentary.replace(
          `${pick.ticker} (${pick.ticker})`,
          `${pick.ticker} (${details.name})`
        );
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

        const scored = scoreBars(candles, candles, productId, name); // crypto has no SPY baseline
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
