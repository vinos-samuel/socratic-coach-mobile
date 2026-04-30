import { MomentumPick, OHLCVBar } from "@/types";
import { getDailyBars, getTickerDetails, PolygonBar } from "./polygon";
import { getCoinbase4hrCandles, TOP_CRYPTO_PAIRS } from "./coinbase";
import { scoreBars } from "./scoring";

// Curated high-momentum S&P 500 candidates — all accessible via individual aggregate calls
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

// Liquid small-cap momentum candidates — benchmarked vs IWM (Russell 2000)
// Score threshold: 55 (vs 65 for large caps) — wider band to catch early runners
const SMALL_CAP_UNIVERSE = [
  // Biotech / gene editing — highest momentum potential, catalyst-driven
  "RXRX", "BEAM", "EDIT", "NTLA", "PRAX", "AGEN", "ARCT", "VERV", "NKTR", "FATE",
  // High-growth tech & software
  "TASK", "BIGC", "SEMR", "DOMO", "ALRM", "APPS", "RSKD", "CODA",
  // Clean energy / EV charging infrastructure
  "BLNK", "CHPT", "PLUG", "FCEL", "BE", "STEM",
  // Materials / specialty resources
  "HCC", "METC", "MP", "SXC",
  // Healthcare devices & services
  "AXNX", "SILK", "NVCR", "BLFS", "ACCD", "HIMS",
  // Defense / space technology
  "KTOS", "RKLB", "RDW",
  // Crypto miners / digital asset infrastructure
  "MARA", "RIOT", "CLSK", "CIFR",
  // Semiconductor equipment (smaller)
  "ACMR", "DIOD", "FORM", "ONTO",
  // Quantum / emerging deep tech
  "IONQ",
  // Fintech / alternative lending
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

async function buildPick(
  ticker: string,
  bars: OHLCVBar[],
  benchmarkBars: OHLCVBar[],
  type: "stock" | "smallcap",
  options: { benchmarkName: string; maxStopPct: number; threshold: number }
): Promise<MomentumPick | null> {
  const scored = scoreBars(bars, benchmarkBars, ticker, ticker, {
    benchmarkName: options.benchmarkName,
    maxStopPct: options.maxStopPct,
  });
  if (!scored || scored.score < options.threshold) return null;

  const lastBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2];
  const price = lastBar.close;
  const change = price - (prevBar?.close ?? price);
  const changePct = prevBar ? (change / prevBar.close) * 100 : 0;

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
    type: type === "smallcap" ? "stock" : type,
  };
}

async function runScan(
  universe: string[],
  benchmarkTicker: string,
  options: { benchmarkName: string; maxStopPct: number; threshold: number; type: "stock" | "smallcap"; limit: number }
): Promise<MomentumPick[]> {
  const benchmarkRaw = await getDailyBars(benchmarkTicker, 252);
  const benchmarkBars = benchmarkRaw.map(polygonToOHLCV);
  if (benchmarkBars.length < 55) throw new Error(`Could not fetch ${benchmarkTicker} baseline data`);

  const results: MomentumPick[] = [];

  await Promise.allSettled(
    universe.map(async (ticker) => {
      try {
        const rawBars = await getDailyBars(ticker, 252);
        const bars = rawBars.map(polygonToOHLCV);
        const pick = await buildPick(ticker, bars, benchmarkBars, options.type, options);
        if (pick) results.push(pick);
      } catch {
        // skip tickers that fail
      }
    })
  );

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, options.limit);

  // Enrich with real company names
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
    type: "stock",
    limit,
  });
}

export function runSmallCapScan(limit = 10): Promise<MomentumPick[]> {
  return runScan(SMALL_CAP_UNIVERSE, "IWM", {
    benchmarkName: "Russell 2000",
    maxStopPct: 0.07,
    threshold: 55,
    type: "smallcap",
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
