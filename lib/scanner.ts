import { MomentumPick, OHLCVBar } from "@/types";
import { getDailyBars, getTickerDetails, PolygonBar } from "./polygon";
import { getCoinbase4hrCandles, TOP_CRYPTO_PAIRS } from "./coinbase";
import { scoreBars } from "./scoring";
import { getFinnhubQuote, enrichBarsWithToday, FinnhubQuote } from "./finnhub";

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
  "RXRX", "BEAM", "EDIT", "NTLA", "PRAX", "AGEN", "ARCT", "VERV", "NKTR", "FATE",
  "TASK", "BIGC", "SEMR", "DOMO", "ALRM", "APPS", "RSKD", "CODA",
  "BLNK", "CHPT", "PLUG", "FCEL", "BE", "STEM",
  "HCC", "METC", "MP", "SXC",
  "AXNX", "SILK", "NVCR", "BLFS", "ACCD", "HIMS",
  "KTOS", "RKLB", "RDW",
  "MARA", "RIOT", "CLSK", "CIFR",
  "ACMR", "DIOD", "FORM", "ONTO",
  "IONQ",
  "OPFI", "ENVA",
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

// Build a pick from already-fetched bars + Finnhub quote.
// Finnhub data is spliced into bars BEFORE scoring so all signals
// (EMA positions, RSI, VWAP, volume ratio) reflect today's price action.
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

  // Use Finnhub's live price and prev-close for accurate change display
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
  // Fetch benchmark bars + its live quote in parallel so RS Rating also uses today's benchmark close
  const [benchmarkRaw, benchmarkQuote] = await Promise.all([
    getDailyBars(benchmarkTicker, 252),
    getFinnhubQuote(benchmarkTicker),
  ]);
  const benchmarkBars = enrichBarsWithToday(benchmarkRaw.map(polygonToOHLCV), benchmarkQuote);
  if (benchmarkBars.length < 55) throw new Error(`Could not fetch ${benchmarkTicker} baseline data`);

  const results: MomentumPick[] = [];

  // For each ticker: fetch Polygon history and Finnhub quote simultaneously,
  // enrich bars with today's candle, then score — all in one pass
  await Promise.allSettled(
    universe.map(async (ticker) => {
      try {
        const [rawBars, quote] = await Promise.all([
          getDailyBars(ticker, 252),
          getFinnhubQuote(ticker),
        ]);
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
  const results: MomentumPick[] = [];

  await Promise.allSettled(
    TOP_CRYPTO_PAIRS.map(async ({ productId, name }) => {
      try {
        const candles = await getCoinbase4hrCandles(productId, 50);
        if (candles.length < 55) return;

        const scored = scoreBars(candles, candles, productId, name);
        if (!scored || scored.score < 40) return;

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
