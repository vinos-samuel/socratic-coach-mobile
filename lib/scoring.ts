import { MomentumSignal, TradeSetup } from "@/types";
import { OHLCVBar } from "@/types";
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

export interface ScoringResult {
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

export function scoreBars(
  bars: OHLCVBar[],
  spyBars: OHLCVBar[],
  ticker: string,
  name: string,
  options: { benchmarkName?: string; maxStopPct?: number } = {}
): ScoringResult | null {
  if (bars.length < 55) return null;

  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const rsiSeries = calculateRSI(closes, 14);
  const volumeRatio = calculateVolumeRatio(volumes, 20);
  const rsRating = calculateRSRating(closes, spyBars.map((b) => b.close), closes.length);
  const anchoredVwap = calculateAnchoredVWAP(bars);
  const atr = calculateATR(bars, 14);

  const lastClose = closes[closes.length - 1];
  const lastEma9 = ema9[ema9.length - 1];
  const lastEma21 = ema21[ema21.length - 1];
  const lastEma50 = ema50[ema50.length - 1];
  const lastRsi = rsiSeries[rsiSeries.length - 1];

  const emaStack = isEMAStackAligned(ema9, ema21, ema50);
  const emaCross921 = hasEMA921BullishCross(ema9, ema21);
  const aboveVwap = anchoredVwap !== null ? lastClose > anchoredVwap : true;

  // Scoring
  let score = 0;
  score += Math.min(35, rsRating * 0.35);
  score += emaStack ? 15 : lastClose > lastEma50 ? 7 : 0;
  score += lastClose > lastEma21 ? 5 : 0;
  score += lastClose > lastEma9 ? 5 : 0;
  score += Math.min(20, (volumeRatio - 1) * 10);
  const rsiScore = lastRsi >= 55 && lastRsi <= 80 ? 10 : lastRsi >= 50 && lastRsi < 55 ? 5 : 0;
  score += rsiScore;
  score += emaCross921 ? 5 : 0;
  score += aboveVwap ? 5 : 0;
  score = Math.round(Math.max(0, Math.min(100, score)));

  const signals = buildSignals(
    rsRating, emaStack, emaCross921, volumeRatio, lastRsi, aboveVwap,
    lastClose, lastEma9, lastEma21, lastEma50, anchoredVwap,
    options.benchmarkName ?? "S&P 500"
  );

  const tradeSetup = buildTradeSetup(lastClose, lastEma9, atr, anchoredVwap, options.maxStopPct ?? 0.05);
  const ruleBasedCommentary = buildCommentary(ticker, name, score, rsRating, volumeRatio, lastRsi, tradeSetup, signals);

  const distanceFromEma9Pct = lastEma9 > 0 ? ((lastClose - lastEma9) / lastEma9) * 100 : 0;

  return {
    score, rsRating, volumeRatio, rsi: lastRsi,
    emaStack, emaCross921, aboveVwap, anchoredVwap,
    ema9, ema21, ema50, rsiSeries, signals, tradeSetup, ruleBasedCommentary,
    distanceFromEma9Pct,
  };
}

function buildSignals(
  rsRating: number, emaStack: boolean, emaCross921: boolean, volumeRatio: number,
  rsi: number, aboveVwap: boolean, price: number, ema9: number, ema21: number,
  ema50: number, vwap: number | null, benchmarkName = "S&P 500"
): MomentumSignal[] {
  return [
    {
      name: "emaStack", label: "EMA Stack",
      value: emaStack ? "9 > 21 > 50, all rising" : `Price vs EMAs: ${price > ema50 ? "above 50" : "below 50"}`,
      status: emaStack ? "pass" : price > ema50 ? "warn" : "fail",
    },
    {
      name: "rsRating", label: "RS Rating",
      value: `${rsRating} / 100 vs ${benchmarkName}`,
      status: rsRating >= 80 ? "pass" : rsRating >= 60 ? "warn" : "fail",
    },
    {
      name: "volume", label: "Volume",
      value: `${volumeRatio.toFixed(1)}x 20-day average`,
      status: volumeRatio >= 1.5 ? "pass" : volumeRatio >= 1.0 ? "warn" : "fail",
    },
    {
      name: "rsi", label: "RSI (14)",
      value: `${rsi.toFixed(0)} ${rsi >= 55 && rsi <= 80 ? "— momentum zone" : rsi > 80 ? "— overbought" : "— below zone"}`,
      status: rsi >= 55 && rsi <= 80 ? "pass" : rsi >= 50 ? "warn" : "fail",
    },
    {
      name: "emaCross", label: "9/21 EMA Cross",
      value: emaCross921 ? "Bullish cross (last 4 bars)" : "No recent cross",
      status: emaCross921 ? "pass" : price > ema21 ? "warn" : "fail",
    },
    {
      name: "vwap", label: "Anchored VWAP",
      value: vwap ? `Price ${aboveVwap ? "above" : "below"} VWAP at $${vwap.toFixed(2)}` : "Insufficient data",
      status: aboveVwap ? "pass" : "fail",
    },
  ];
}

function buildTradeSetup(
  price: number,
  ema9: number,
  atr: number,
  vwap: number | null,
  maxStopPct = 0.05
): TradeSetup {
  // Entry: current price or pullback to 9 EMA
  const entryLow = +Math.min(price * 0.999, ema9 * 1.002).toFixed(2);
  const entryHigh = +(price * 1.004).toFixed(2);

  // Stop: 1.5x ATR below entry, clamped to 2.5%–maxStopPct of price
  const atrStop = atr > 0 ? atr * 1.5 : price * 0.03;
  const stopDollar = Math.min(Math.max(atrStop, price * 0.025), price * maxStopPct);
  const stopLoss = +(price - stopDollar).toFixed(2);
  const stopLossPct = +((stopLoss - price) / price * 100).toFixed(1);

  // Target: 2.5x ATR above entry, minimum 2:1 R:R
  const targetDollar = Math.max(atr * 2.5, stopDollar * 2.0);
  const target = +(price + targetDollar).toFixed(2);
  const targetPct = +((target - price) / price * 100).toFixed(1);
  const riskReward = +(targetPct / Math.abs(stopLossPct)).toFixed(2);

  const stopReason = vwap && price > vwap ? "anchored VWAP / 9 EMA" : "9-day EMA";

  return {
    entryLow,
    entryHigh,
    entryTrigger: `Breakout above $${entryHigh} with volume, or pullback to 9 EMA at $${ema9.toFixed(2)}`,
    target,
    targetPct,
    stopLoss,
    stopLossPct,
    riskReward,
    stopReason,
  };
}

function buildCommentary(
  ticker: string, name: string, score: number, rs: number,
  volRatio: number, rsi: number, setup: TradeSetup, signals: MomentumSignal[]
): string {
  const passCount = signals.filter((s) => s.status === "pass").length;
  const strength = score >= 80 ? "strong" : score >= 65 ? "solid" : "developing";
  return `${ticker} (${name}) shows a ${strength} momentum setup scoring ${score}/100. RS Rating of ${rs}/100 puts it in the top ${100 - rs}% of the market. Volume is ${volRatio.toFixed(1)}x the 20-day average — ${volRatio >= 2 ? "significant institutional activity" : "above-average interest"}. RSI at ${rsi.toFixed(0)} is ${rsi >= 55 && rsi <= 80 ? "in the optimal momentum zone (55-80)" : rsi > 80 ? "elevated — watch for pullback" : "below the momentum zone"}. ${passCount}/6 signals confirmed. Entry zone $${setup.entryLow}–$${setup.entryHigh}, target $${setup.target} (+${setup.targetPct}%), stop $${setup.stopLoss} (${setup.stopLossPct}%) below ${setup.stopReason}.`;
}
