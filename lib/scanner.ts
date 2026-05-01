import { MomentumPick, OHLCVBar } from "@/types";
import {
  getDailyBars,
  getTickerDetails,
  getSnapshotBatch,
  PolygonSnapshotEntry,
  PolygonBar,
} from "./polygon";
import { getCoinbaseDailyCandles, TOP_CRYPTO_PAIRS } from "./coinbase";
import { scoreBars } from "./scoring";
import { getFinnhubQuote, enrichBarsWithToday, getFinnhubNews, FinnhubQuote } from "./finnhub";
import { getStockTwitsSentiment } from "./stocktwits";

// Curated high-momentum S&P 500 candidates
const SCAN_UNIVERSE = [
  "NVDA", "AMD", "AAPL", "MSFT", "META", "GOOGL", "AMZN", "TSLA", "AVGO", "ORCL",
  "CRM", "ADBE", "NOW", "PANW", "CRWD", "SNPS", "CDNS", "KLAC", "LRCX", "AMAT",
  "JPM", "GS", "MS", "V", "MA",
  "LLY", "ABBV", "ISRG", "VRTX", "REGN",
  "XOM", "CVX", "CAT", "DE", "ETN",
];

// Liquid small-cap momentum candidates — benchmarked vs IWM (Russell 2000)
const SMALL_CAP_UNIVERSE = [
  "RXRX", "BEAM", "EDIT", "NTLA", "PRAX", "AGEN", "ARCT", "NKTR", "FATE",
  "TASK", "BIGC", "SEMR", "DOMO", "ALRM", "APPS", "RSKD", "CODA",
  "BLNK", "CHPT", "PLUG", "FCEL", "BE", "STEM",
  "HCC", "METC", "MP", "SXC",
  "AXNX", "SILK", "NVCR", "BLFS", "ACCD", "HIMS",
  "KTOS", "RKLB", "RDW",
  "MARA", "RIOT", "CLSK", "CIFR",
  "ACMR", "DIOD", "FORM", "ONTO",
  "IONQ",
  "OPFI", "ENVA",
  // VERV removed — acquired, stale data scores unrealistically high
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

// Maps a Polygon real-time snapshot entry to the FinnhubQuote shape so
// enrichBarsWithToday() can use it unchanged. Key improvement: day.v gives
// real intraday volume instead of the Finnhub fallback of volume=0.
function snapshotToQuote(entry: PolygonSnapshotEntry): FinnhubQuote {
  return {
    c: entry.lastTrade?.p || entry.day.c,
    d: entry.todaysChange,
    dp: entry.todaysChangePerc,
    h: entry.day.h,
    l: entry.day.l,
    o: entry.day.o,
    pc: entry.prevDay.c,
    // Polygon lastTrade.t is nanoseconds; FinnhubQuote.t is unix seconds
    t: entry.lastTrade?.t ? Math.floor(entry.lastTrade.t / 1_000_000_000) : Math.floor(Date.now() / 1000),
    v: entry.day.v,
  };
}

// Build a pick from already-fetched bars + quote.
// Quote is spliced into bars BEFORE scoring so all signals reflect today's price action.
function buildPick(
  ticker: string,
  rawBars: OHLCVBar[],
  quote: FinnhubQuote | null,
  benchmarkBars: OHLCVBar[],
  type: "stock",
  options: { benchmarkName: string; maxStopPct: number; threshold: number }
): MomentumPick | null {
  const bars = enrichBarsWithToday(rawBars, quote);

  const scored = scoreBars(bars, benchmarkBars, ticker, ticker, {
    benchmarkName: options.benchmarkName,
    maxStopPct: options.maxStopPct,
  });
  if (!scored || scored.score < options.threshold) return null;

  const price = quote?.c && quote.c > 0 ? quote.c : bars[bars.length - 1].close;
  const prevClose = quote?.pc && quote.pc > 0 ? quote.pc : (bars[bars.length - 2]?.close ?? price);
  const change = price - prevClose;
  const changePct = (change / prevClose) * 100;

  return {
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
    type,
  };
}

async function runScan(
  universe: string[],
  benchmarkTicker: string,
  options: { benchmarkName: string; maxStopPct: number; threshold: number; limit: number }
): Promise<MomentumPick[]> {
  // Fetch benchmark bars and a batch snapshot for the entire universe + benchmark
  // in parallel. The snapshot (Polygon Starter) gives real-time prices and intraday
  // volume for all tickers in one API call instead of 80+ individual Finnhub calls.
  const allTickers = [...universe, benchmarkTicker];
  const [benchmarkRaw, snapshotMap] = await Promise.all([
    getDailyBars(benchmarkTicker, 252),
    getSnapshotBatch(allTickers),
  ]);

  // Resolve the benchmark quote: prefer Polygon snapshot, fall back to Finnhub
  const benchmarkSnap = snapshotMap.get(benchmarkTicker);
  const benchmarkQuote = benchmarkSnap
    ? snapshotToQuote(benchmarkSnap)
    : await getFinnhubQuote(benchmarkTicker);

  const benchmarkBars = enrichBarsWithToday(benchmarkRaw.map(polygonToOHLCV), benchmarkQuote);
  if (benchmarkBars.length < 55) throw new Error(`Could not fetch ${benchmarkTicker} baseline data`);

  const benchmarkLastBarTime = benchmarkRaw[benchmarkRaw.length - 1].t / 1000;

  const results: MomentumPick[] = [];

  await Promise.allSettled(
    universe.map(async (ticker) => {
      try {
        // Fetch 252-day history; quote comes from the snapshot batch (or Finnhub fallback)
        const rawBars = await getDailyBars(ticker, 252);

        const tickerLastBarTime = rawBars[rawBars.length - 1].t / 1000;
        const daysBehind = (benchmarkLastBarTime - tickerLastBarTime) / 86400;
        if (daysBehind > 5) return;

        const snap = snapshotMap.get(ticker);
        // On free Polygon tier, snapshot is empty. Calling getFinnhubQuote() for
        // every universe ticker in parallel (35+ calls) exhausts the 60 req/min
        // Finnhub limit before news enrichment can run. Skip per-ticker live price
        // on free tier and use yesterday's EOD close from getDailyBars instead.
        // Live intraday prices are available automatically when Polygon Starter is active.
        const quote = snap ? snapshotToQuote(snap) : null;

        const bars = rawBars.map(polygonToOHLCV);
        const pick = buildPick(ticker, bars, quote, benchmarkBars, "stock", options);
        if (pick) results.push(pick);
      } catch {
        // skip tickers that fail
      }
    })
  );

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, options.limit);

  // Enrich top picks with company names, Finnhub news, and StockTwits sentiment.
  // All run in parallel; failures are silent so they never block the picks response.
  await Promise.allSettled(
    top.map(async (pick) => {
      const [details, news, sentiment] = await Promise.allSettled([
        getTickerDetails(pick.ticker),
        getFinnhubNews(pick.ticker),
        getStockTwitsSentiment(pick.ticker),
      ]);

      if (details.status === "fulfilled") pick.name = details.value.name;

      const newsVal = news.status === "fulfilled" ? news.value : null;
      const sentVal = sentiment.status === "fulfilled" ? sentiment.value : null;
      console.log(`[Enrich] ${pick.ticker}: news=${newsVal ? `${newsVal.count} articles` : "null"} | sentiment=${sentVal ? `${sentVal.bullishPct}% bull (${sentVal.total} tagged)` : "null"}`);

      if (newsVal && newsVal.count > 0) {
        pick.newsCount = newsVal.count;
        pick.latestHeadline = newsVal.latest ?? undefined;
      }

      if (sentVal) {
        pick.sentiment = sentVal;
      }
    })
  );

  return top;
}

export function runStockScan(limit = 10): Promise<MomentumPick[]> {
  return runScan(SCAN_UNIVERSE, "SPY", {
    benchmarkName: "S&P 500",
    maxStopPct: 0.05,
    threshold: 65,
    limit,
  });
}

export function runSmallCapScan(limit = 10): Promise<MomentumPick[]> {
  return runScan(SMALL_CAP_UNIVERSE, "IWM", {
    benchmarkName: "Russell 2000",
    maxStopPct: 0.07,
    threshold: 55,
    limit,
  });
}

export async function runCryptoScan(limit = 6): Promise<MomentumPick[]> {
  // BTC as the crypto benchmark — "is this coin outperforming Bitcoin?"
  const btcBars = await getCoinbaseDailyCandles("BTC-USD", 252);
  const btcLastBarTime = btcBars[btcBars.length - 1].time;

  const results: MomentumPick[] = [];

  await Promise.allSettled(
    TOP_CRYPTO_PAIRS.map(async ({ productId, name }) => {
      try {
        const candles = await getCoinbaseDailyCandles(productId, 252);
        if (candles.length < 55) return;

        const daysBehind = (btcLastBarTime - candles[candles.length - 1].time) / 86400;
        if (daysBehind > 2) return;

        const scored = scoreBars(candles, btcBars, productId, name, {
          benchmarkName: "Bitcoin",
          maxStopPct: 0.08,
        });
        if (!scored || scored.score < 45) return;

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
