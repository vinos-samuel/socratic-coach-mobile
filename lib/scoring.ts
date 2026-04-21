import { MomentumSignal, TradeSetup } from "@/types";
import { OHLCVBar } from "@/types";
import {
  calculateEMA,
  calculateRSI,
  calculateVolumeRatio,
  calculateRSRating,
  calculateAnchoredVWAP,
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
}

export function scoreBars(
  bars: OHLCVBar[],
  spyBars: OHLCVBar[],
  ticker: string,
  name: string
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
  score += Math.min(35, rsRating * 0.35); // RS Rating: up to 35 pts
  score += emaStack ? 15 : lastClose > lastEma50 ? 7 : 0; // EMA stack: up to 15
  score += lastClose > lastEma21 ? 5 : 0; // Above 21 EMA: 5 pts
  score += lastClose > lastEma9 ? 5 : 0; // Above 9 EMA: 5 pts
  score += Math.min(20, (volumeRatio - 1) * 10); // Volume: up to 20 pts at 3x
  const rsiScore = lastRsi >= 55 && lastRsi <= 80 ? 10 : lastRsi >= 50 && lastRsi < 55 ? 5 : 0;
  score += rsiScore; // RSI zone: up to 10 pts
  score += emaCross921 ? 5 : 0; // Recent 9/21 cross: 5 pts
  score += aboveVwap ? 5 : 0; // Above anchored VWAP: 5 pts
  score = Math.round(Math.max(0, Math.min(100, score)));

  const signals = buildSignals(
    rsRating,
    emaStack,
    emaCross921,
    volumeRatio,
    lastRsi,
    aboveVwap,
    lastClose,
    lastEma9,
    lastEma21,
    lastEma50,
    anchoredVwap
  );

  const tradeSetup = buildTradeSetup(lastClose, lastEma21, lastEma50, anchoredVwap);
  const ruleBasedCommentary = buildCommentary(ticker, name, score, rsRating, volumeRatio, lastRsi, tradeSetup, signals);

  return {
    score,
    rsRating,
    volumeRatio,
    rsi: lastRsi,
    emaStack,
    emaCross921,
    aboveVwap,
    anchoredVwap,
    ema9,
    ema21,
    ema50,
    rsiSeries,
    signals,
    tradeSetup,
    ruleBasedCommentary,
  };
}

function buildSignals(
  rsRating: number,
  emaStack: boolean,
  emaCross921: boolean,
  volumeRatio: number,
  rsi: number,
  aboveVwap: boolean,
  price: number,
  ema9: number,
  ema21: number,
  ema50: number,
  vwap: number | null
): MomentumSignal[] {
  return [
    {
      name: "emaStack",
      label: "EMA Stack",
      value: emaStack ? "9 > 21 > 50, all rising" : `Price vs EMAs: ${price > ema50 ? "above 50" : "below 50"}`,
      status: emaStack ? "pass" : price > ema50 ? "warn" : "fail",
    },
    {
      name: "rsRating",
      label: "RS Rating",
      value: `${rsRating} / 100 vs S&P 500`,
      status: rsRating >= 80 ? "pass" : rsRating >= 60 ? "warn" : "fail",
    },
    {
      name: "volume",
      label: "Volume",
      value: `${volumeRatio.toFixed(1)}x 20-day average`,
      status: volumeRatio >= 1.5 ? "pass" : volumeRatio >= 1.0 ? "warn" : "fail",
    },
    {
      name: "rsi",
      label: "RSI (14)",
      value: `${rsi.toFixed(0)} ${rsi >= 55 && rsi <= 80 ? "— momentum zone" : rsi > 80 ? "— overbought" : "— below zone"}`,
      status: rsi >= 55 && rsi <= 80 ? "pass" : rsi >= 50 ? "warn" : "fail",
    },
    {
      name: "emaCross",
      label: "9/21 EMA Cross",
      value: emaCross921 ? "Bullish cross (last 4 bars)" : "No recent cross",
      status: emaCross921 ? "pass" : price > ema21 ? "warn" : "fail",
    },
    {
      name: "vwap",
      label: "Anchored VWAP",
      value: vwap ? `Price ${aboveVwap ? "above" : "below"} VWAP at $${vwap.toFixed(2)}` : "Insufficient data",
      status: aboveVwap ? "pass" : "fail",
    },
  ];
}

function buildTradeSetup(
  price: number,
  ema21: number,
  ema50: number,
  vwap: number | null
): TradeSetup {
  const entryLow = price * 0.99;
  const entryHigh = price * 1.005;
  const supportLevel = Math.max(ema21, vwap ?? ema50);
  const stopLoss = Math.min(supportLevel * 0.99, price * 0.95);
  const stopLossPct = ((stopLoss - price) / price) * 100;
  const targetPct = Math.abs(stopLossPct) * 1.6; // ~1.6:1 R:R minimum
  const target = price * (1 + targetPct / 100);
  const riskReward = Math.abs(targetPct / stopLossPct);
  const stopReason = vwap && supportLevel === vwap * 0.99 ? "anchored VWAP" : "21-day EMA";

  return {
    entryLow: +entryLow.toFixed(2),
    entryHigh: +entryHigh.toFixed(2),
    entryTrigger: `Continuation above $${entryHigh.toFixed(2)} or pullback to 9 EMA`,
    target: +target.toFixed(2),
    targetPct: +targetPct.toFixed(1),
    stopLoss: +stopLoss.toFixed(2),
    stopLossPct: +stopLossPct.toFixed(1),
    riskReward: +riskReward.toFixed(2),
    stopReason,
  };
}

function buildCommentary(
  ticker: string,
  name: string,
  score: number,
  rs: number,
  volRatio: number,
  rsi: number,
  setup: TradeSetup,
  signals: MomentumSignal[]
): string {
  const passCount = signals.filter((s) => s.status === "pass").length;
  const strength = score >= 80 ? "strong" : score >= 65 ? "solid" : "developing";
  return `${ticker} (${name}) shows a ${strength} momentum setup scoring ${score}/100. RS Rating of ${rs}/100 puts it in the top ${100 - rs}% of the market. Volume is ${volRatio.toFixed(1)}x the 20-day average — ${volRatio >= 2 ? "significant institutional activity" : "above-average interest"}. RSI at ${rsi.toFixed(0)} is ${rsi >= 55 && rsi <= 80 ? "in the optimal momentum zone (55-80)" : rsi > 80 ? "elevated — watch for pullback" : "below the momentum zone"}. ${passCount}/6 signals confirmed. Entry zone $${setup.entryLow}–$${setup.entryHigh}, target $${setup.target} (+${setup.targetPct}%), stop $${setup.stopLoss} (${setup.stopLossPct}%) below ${setup.stopReason}.`;
}
