import { MomentumPick, MomentumSignal, OHLCVBar, TradeSetup } from "@/types";
import {
  getDailyBars,
  getTickerDetails,
  getSnapshotBatch,
  PolygonSnapshotEntry,
  PolygonBar,
} from "./polygon";
import { enrichBarsWithToday, getFinnhubNews, FinnhubQuote } from "./finnhub";
import { getStockTwitsSentiment } from "./stocktwits";
import {
  calculateEMA,
  calculateRSI,
  calculateVolumeRatio,
  calculateRSRating,
  calculateAnchoredVWAP,
  calculateATR,
  isEMAStackAligned,
  hasEMA921BullishCross,
} from "./indicators";

// Beaten-down stocks with Stage 1→2 / VCP potential — higher risk, higher reward
const SPECULATIVE_UNIVERSE = [
  // Quantum computing
  "IONQ", "RGTI", "QUBT",
  // Biotech recovery — pipeline plays off highs
  "ABCL", "CRSP", "BEAM", "EDIT", "NTLA", "FATE", "ARCT", "AGEN", "PRAX", "RXRX", "NKTR", "BLFS",
  // Clean energy fallen angels
  "RUN", "ENPH", "SEDG", "SPWR", "BLNK", "CHPT", "PLUG", "FCEL", "BE", "STEM",
  // Fintech / lending recovery
  "UPST", "SOFI", "AFRM", "LMND", "OPEN", "MQ", "OPFI", "ENVA",
  // Software fallen angels
  "PATH", "ZI", "FROG", "FSLY", "DOMO", "BIGC", "SEMR",
  // Critical minerals / commodities
  "MP", "UAMY", "HCC", "METC",
  // Crypto miners (leverage play on BTC)
  "MARA", "RIOT", "CLSK", "CIFR",
  // Space / satellite / defense tech
  "RKLB", "RDW", "ASTS", "LUNR", "KTOS",
  // Small cap semis
  "ACMR", "DIOD", "FORM", "ONTO", "AXNX", "SILK", "NVCR",
  // Other high-conviction speculative
  "HIMS", "TASK", "ACCD", "APPS", "RSKD",
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

function snapshotToQuote(entry: PolygonSnapshotEntry): FinnhubQuote {
  return {
    c: entry.lastTrade?.p || entry.day.c,
    d: entry.todaysChange,
    dp: entry.todaysChangePerc,
    h: entry.day.h,
    l: entry.day.l,
    o: entry.day.o,
    pc: entry.prevDay.c,
    t: entry.lastTrade?.t ? Math.floor(entry.lastTrade.t / 1_000_000_000) : Math.floor(Date.now() / 1000),
    v: entry.day.v,
  };
}

interface SpeculativeResult {
  score: number;
  rsRating: number;
  volumeRatio: number;
  rsi: number;
  emaStack: boolean;
  emaCross921: boolean;
  aboveVwap: boolean;
  anchoredVwap: number | null;
  ema9: number[];
  ema21: number[];
  ema50: number[];
  rsiSeries: number[];
  signals: MomentumSignal[];
  tradeSetup: TradeSetup;
  ruleBasedCommentary: string;
  distanceFromEma9Pct: number;
}

// VCP / Stage 1→2 scorer — different weights from standard momentum scorer:
// rewards ATR compression, EMA50 recovery, tight base, volume drying up
function scoreSpeculative(
  bars: OHLCVBar[],
  benchmarkBars: OHLCVBar[],
  ticker: string,
  name: string,
  options: { benchmarkName?: string; maxStopPct?: number } = {}
): SpeculativeResult | null {
  if (bars.length < 55) return null;

  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const rsiSeries = calculateRSI(closes, 14);
  const volumeRatio = calculateVolumeRatio(volumes, 20);
  const rsRating = calculateRSRating(closes, benchmarkBars.map((b) => b.close), closes.length);
  const anchoredVwap = calculateAnchoredVWAP(bars);
  const atr = calculateATR(bars, 14);
  // ATR 20 bars ago to measure compression
  const atrOld = bars.length > 34 ? calculateATR(bars.slice(0, -20), 14) : atr;

  const lastClose = closes[closes.length - 1];
  const lastEma9 = ema9[ema9.length - 1];
  const lastEma21 = ema21[ema21.length - 1];
  const lastEma50 = ema50[ema50.length - 1];
  const lastRsi = rsiSeries[rsiSeries.length - 1];

  const emaStack = isEMAStackAligned(ema9, ema21, ema50);
  const emaCross921 = hasEMA921BullishCross(ema9, ema21);
  const aboveVwap = anchoredVwap !== null ? lastClose > anchoredVwap : true;
  const distanceFromEma9Pct = lastEma9 > 0 ? ((lastClose - lastEma9) / lastEma9) * 100 : 0;

  // ATR compression ratio — lower = more coiled
  const atrRatio = atrOld > 0 ? atr / atrOld : 1;

  // 20-bar base range (high-low / close) — tighter = better consolidation
  const recent20 = bars.slice(-20);
  const base20High = Math.max(...recent20.map((b) => b.high));
  const base20Low = Math.min(...recent20.map((b) => b.low));
  const baseRange = lastClose > 0 ? (base20High - base20Low) / lastClose : 1;

  // EMA50 proximity: Stage 1→2 transition
  const distFromEma50 = lastEma50 > 0 ? (lastClose - lastEma50) / lastEma50 : 0;
  const aboveEma50 = lastClose > lastEma50;
  const nearEma50 = distFromEma50 > -0.08 && distFromEma50 < 0.20;

  // RS improving vs 21 bars ago
  const spyCloses = benchmarkBars.map((b) => b.close);
  const rsOld = closes.length > 21
    ? calculateRSRating(closes.slice(0, -21), spyCloses.slice(0, -21), closes.length - 21)
    : rsRating;
  const rsImproving = rsRating > rsOld;

  // --- Scoring (max ~105, clamped to 100) ---
  let score = 0;

  // ATR compression (20 pts) — volatility drying up before the breakout
  if (atrRatio < 0.45) score += 20;
  else if (atrRatio < 0.60) score += 15;
  else if (atrRatio < 0.75) score += 10;
  else if (atrRatio < 0.90) score += 5;

  // EMA50 recovery (25 pts) — the Stage 1→2 transition signal
  if (aboveEma50 && nearEma50) score += 25;
  else if (nearEma50 && !aboveEma50) score += 12;
  else if (aboveEma50 && distFromEma50 < 0.30) score += 15;

  // Tight base (15 pts)
  if (baseRange < 0.15) score += 15;
  else if (baseRange < 0.22) score += 10;
  else if (baseRange < 0.30) score += 5;

  // Volume contraction (10 pts) — accumulation phase
  if (volumeRatio < 0.60) score += 10;
  else if (volumeRatio < 0.80) score += 7;
  else if (volumeRatio < 1.00) score += 3;

  // RS improving (10 pts)
  score += rsImproving ? 10 : 0;

  // RS baseline (10 pts max)
  score += Math.min(10, rsRating * 0.10);

  // RSI in accumulation-to-momentum zone (10 pts)
  if (lastRsi >= 45 && lastRsi <= 65) score += 10;
  else if (lastRsi >= 38 && lastRsi < 45) score += 5;
  else if (lastRsi > 65 && lastRsi <= 75) score += 7;

  // Bonus: EMA cross recently
  score += emaCross921 ? 5 : 0;

  score = Math.round(Math.max(0, Math.min(100, score)));

  const signals: MomentumSignal[] = [
    {
      name: "atrCompression", label: "ATR Compression",
      value: atrRatio < 0.75 ? `${Math.round((1 - atrRatio) * 100)}% tighter than 20d ago` : "Volatility not yet contracting",
      status: atrRatio < 0.60 ? "pass" : atrRatio < 0.85 ? "warn" : "fail",
    },
    {
      name: "ema50Recovery", label: "EMA 50 Recovery",
      value: aboveEma50 ? `${distFromEma50 > 0 ? "+" : ""}${(distFromEma50 * 100).toFixed(1)}% above EMA 50` : `${(distFromEma50 * 100).toFixed(1)}% below EMA 50`,
      status: (aboveEma50 && nearEma50) ? "pass" : nearEma50 ? "warn" : "fail",
    },
    {
      name: "basePattern", label: "Base Tightness",
      value: `${(baseRange * 100).toFixed(0)}% 20-day range`,
      status: baseRange < 0.22 ? "pass" : baseRange < 0.30 ? "warn" : "fail",
    },
    {
      name: "volumeContraction", label: "Volume",
      value: `${volumeRatio.toFixed(1)}x average — ${volumeRatio < 1.0 ? "contracting (bullish for base)" : "expanding"}`,
      status: volumeRatio < 1.0 ? "pass" : volumeRatio < 1.3 ? "warn" : "fail",
    },
    {
      name: "rsImproving", label: "RS Improving",
      value: rsImproving ? `RS ${rsRating} — up from ${rsOld} (4wk ago)` : `RS ${rsRating} — flat/declining`,
      status: rsImproving ? "pass" : rsRating >= 40 ? "warn" : "fail",
    },
    {
      name: "rsi", label: "RSI (14)",
      value: `${lastRsi.toFixed(0)} — ${lastRsi >= 45 && lastRsi <= 65 ? "accumulation zone" : lastRsi > 65 ? "approaching momentum" : "oversold territory"}`,
      status: lastRsi >= 45 && lastRsi <= 75 ? "pass" : lastRsi >= 38 ? "warn" : "fail",
    },
  ];

  // Trade setup: wider stops for speculative setups
  const maxStop = options.maxStopPct ?? 0.08;
  const atrStop = atr > 0 ? atr * 2.0 : lastClose * 0.05;
  const stopDollar = Math.min(Math.max(atrStop, lastClose * 0.03), lastClose * maxStop);
  const stopLoss = +(lastClose - stopDollar).toFixed(2);
  const stopLossPct = +((stopLoss - lastClose) / lastClose * 100).toFixed(1);
  const targetDollar = Math.max(atr * 3.5, stopDollar * 2.5);
  const target = +(lastClose + targetDollar).toFixed(2);
  const targetPct = +((target - lastClose) / lastClose * 100).toFixed(1);
  const riskReward = +(targetPct / Math.abs(stopLossPct)).toFixed(2);

  const tradeSetup: TradeSetup = {
    entryLow: +(Math.min(lastClose * 0.999, lastEma9 * 1.002)).toFixed(2),
    entryHigh: +(lastClose * 1.005).toFixed(2),
    entryTrigger: `Breakout above EMA 50 at $${lastEma50.toFixed(2)} on volume surge, or pullback to 9 EMA at $${lastEma9.toFixed(2)}`,
    target,
    targetPct,
    stopLoss,
    stopLossPct,
    riskReward,
    stopReason: "EMA 50 or base low",
  };

  const vcpDesc = atrRatio < 0.60 ? "strong VCP compression" : atrRatio < 0.80 ? "moderate compression" : "early consolidation";
  const stage = aboveEma50 && nearEma50 ? "Stage 2 breakout candidate" : nearEma50 ? "approaching Stage 2" : "Stage 1 base building";
  const ruleBasedCommentary = `${ticker} (${name}) — ${stage}. Scores ${score}/100 on speculative criteria. ATR shows ${vcpDesc} (${Math.round((1 - atrRatio) * 100)}% contraction). 20-day base range: ${(baseRange * 100).toFixed(0)}%. RS ${rsRating}/100 ${rsImproving ? "and improving" : ""}. RSI ${lastRsi.toFixed(0)}. Entry near $${tradeSetup.entryHigh}, target $${target} (+${targetPct}%), stop $${stopLoss} (${stopLossPct}%) at ${tradeSetup.stopReason}.`;

  return {
    score, rsRating, volumeRatio, rsi: lastRsi,
    emaStack, emaCross921, aboveVwap, anchoredVwap,
    ema9, ema21, ema50, rsiSeries, signals, tradeSetup, ruleBasedCommentary,
    distanceFromEma9Pct,
  };
}

export async function runSpeculativeScan(limit = 10): Promise<MomentumPick[]> {
  // Use IWM (Russell 2000) as benchmark — most speculative names are small/mid cap
  const benchmarkTicker = "IWM";
  const allTickers = [...SPECULATIVE_UNIVERSE, benchmarkTicker];

  const [benchmarkRaw, snapshotMap] = await Promise.all([
    getDailyBars(benchmarkTicker, 252),
    getSnapshotBatch(allTickers),
  ]);

  const benchmarkSnap = snapshotMap.get(benchmarkTicker);
  const benchmarkQuote = benchmarkSnap ? snapshotToQuote(benchmarkSnap) : null;
  const benchmarkBars = enrichBarsWithToday(benchmarkRaw.map(polygonToOHLCV), benchmarkQuote);
  if (benchmarkBars.length < 55) throw new Error("Could not fetch IWM baseline data");

  const benchmarkLastBarTime = benchmarkRaw[benchmarkRaw.length - 1].t / 1000;

  const results: MomentumPick[] = [];

  await Promise.allSettled(
    SPECULATIVE_UNIVERSE.map(async (ticker) => {
      try {
        const rawBars = await getDailyBars(ticker, 252);

        const tickerLastBarTime = rawBars[rawBars.length - 1].t / 1000;
        const daysBehind = (benchmarkLastBarTime - tickerLastBarTime) / 86400;
        if (daysBehind > 5) return;

        const snap = snapshotMap.get(ticker);
        const quote = snap ? snapshotToQuote(snap) : null;

        const bars = enrichBarsWithToday(rawBars.map(polygonToOHLCV), quote);
        const scored = scoreSpeculative(bars, benchmarkBars, ticker, ticker, {
          benchmarkName: "Russell 2000",
          maxStopPct: 0.08,
        });
        if (!scored || scored.score < 40) return;

        const price = quote?.c && quote.c > 0 ? quote.c : bars[bars.length - 1].close;
        const prevClose = quote?.pc && quote.pc > 0 ? quote.pc : (bars[bars.length - 2]?.close ?? price);
        const change = price - prevClose;
        const changePct = (change / prevClose) * 100;

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
          distanceFromEma9Pct: +scored.distanceFromEma9Pct.toFixed(1),
          isSpeculative: true,
          type: "stock",
        });
      } catch {
        // skip
      }
    })
  );

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, limit);

  // Enrich top picks with names, news, sentiment
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

      if (newsVal && newsVal.count > 0) {
        pick.newsCount = newsVal.count;
        pick.latestHeadline = newsVal.latest ?? undefined;
      }
      if (sentVal) pick.sentiment = sentVal;
    })
  );

  return top;
}
