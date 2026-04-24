export interface OHLCVBar {
  time: number; // unix timestamp seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorSeries {
  ema9: number[];
  ema21: number[];
  ema50: number[];
  rsi: number[];
  volumeRatio: number;
  anchoredVwap: number | null;
  rsRating: number;
  currentVolRatioToAvg: number;
}

export interface MomentumSignal {
  name: string;
  label: string;
  value: string;
  status: "pass" | "warn" | "fail";
}

export interface TradeSetup {
  entryLow: number;
  entryHigh: number;
  entryTrigger: string;
  target: number;
  targetPct: number;
  stopLoss: number;
  stopLossPct: number;
  riskReward: number;
  stopReason: string;
}

export interface MomentumPick {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  score: number;
  rsRating: number;
  volumeRatio: number;
  rsi: number;
  emaStack: boolean;
  emaCross921: boolean;
  aboveVwap: boolean;
  sparkline: number[];
  tradeSetup: TradeSetup;
  signals: MomentumSignal[];
  ruleBasedCommentary: string;
  type: "stock" | "crypto";
}

export interface ScannerResponse {
  picks: MomentumPick[];
  lastUpdated: string;
  marketOpen: boolean;
  nextScanIn: number; // seconds until next allowed scan
  scanLockedUntil: string; // ISO — when cache expires
}

export interface StockDetailResponse {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  score: number;
  bars: OHLCVBar[];
  ema9Series: Array<{ time: number; value: number }>;
  ema21Series: Array<{ time: number; value: number }>;
  ema50Series: Array<{ time: number; value: number }>;
  vwapSeries: Array<{ time: number; value: number }>;
  rsiSeries: Array<{ time: number; value: number }>;
  volumeSeries: Array<{ time: number; value: number; color: string }>;
  avgVolumeLine: number;
  signals: MomentumSignal[];
  tradeSetup: TradeSetup;
  ruleBasedCommentary: string;
  rsRating: number;
  volumeRatio: number;
  rsi: number;
  livePrice?: number;      // last trade price if Polygon returns it
  priceSource: "live" | "eod";
  dataAsOf: string;        // e.g. "Apr 23" — date of last complete bar
}

export interface DeepAnalysisRequest {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  signals: MomentumSignal[];
  tradeSetup: TradeSetup;
  rsRating: number;
  volumeRatio: number;
  rsi: number;
  score: number;
  type: "stock" | "crypto";
}

export interface DeepAnalysisResponse {
  analysis: string;
}
