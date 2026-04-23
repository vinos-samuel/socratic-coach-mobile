import { OHLCVBar } from "@/types";

export function calculateATR(bars: OHLCVBar[], period = 14): number {
  if (bars.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    trs.push(Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    ));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function calculateEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = new Array(closes.length).fill(NaN);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < closes.length; i++) {
    if (count < period) {
      sum += closes[i];
      count++;
      if (count === period) {
        result[i] = sum / period;
      }
    } else {
      result[i] = closes[i] * k + result[i - 1] * (1 - k);
    }
  }
  return result;
}

export function calculateRSI(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export function calculateVolumeRatio(volumes: number[], period = 20): number {
  if (volumes.length < period + 1) return 1;
  const recent = volumes[volumes.length - 1];
  const avg =
    volumes.slice(volumes.length - period - 1, volumes.length - 1).reduce((a, b) => a + b, 0) / period;
  return avg > 0 ? recent / avg : 1;
}

export function calculateRSRating(
  stockCloses: number[],
  spyCloses: number[],
  len: number
): number {
  const stockReturn = (pct: number) => {
    const end = stockCloses[stockCloses.length - 1];
    const start = stockCloses[Math.max(0, stockCloses.length - pct)];
    return start > 0 ? (end - start) / start : 0;
  };
  const spyReturn = (pct: number) => {
    const end = spyCloses[spyCloses.length - 1];
    const start = spyCloses[Math.max(0, spyCloses.length - pct)];
    return start > 0 ? (end - start) / start : 0;
  };

  const periods = [
    { days: Math.min(252, len), weight: 0.4 },
    { days: Math.min(126, len), weight: 0.2 },
    { days: Math.min(63, len), weight: 0.2 },
    { days: Math.min(21, len), weight: 0.2 },
  ];

  const relStrength = periods.reduce((acc, { days, weight }) => {
    return acc + weight * (stockReturn(days) - spyReturn(days));
  }, 0);

  // Map to 0-100: ±50% relative = full range
  const raw = Math.max(-0.5, Math.min(0.5, relStrength));
  return Math.round(((raw + 0.5) / 1.0) * 100);
}

export function calculateAnchoredVWAP(bars: OHLCVBar[]): number | null {
  if (bars.length < 20) return null;
  // Anchor from the lowest close in the prior 20-40 bars
  const lookback = bars.slice(-40, -1);
  const pivotIdx = lookback.reduce(
    (minIdx, bar, i) => (bar.close < lookback[minIdx].close ? i : minIdx),
    0
  );
  const anchorBars = bars.slice(bars.length - 40 + pivotIdx);

  let cumTPV = 0;
  let cumVol = 0;
  for (const bar of anchorBars) {
    const tp = (bar.high + bar.low + bar.close) / 3;
    cumTPV += tp * bar.volume;
    cumVol += bar.volume;
  }
  return cumVol > 0 ? cumTPV / cumVol : null;
}

export function isEMAStackAligned(ema9: number[], ema21: number[], ema50: number[]): boolean {
  const last = (arr: number[]) => arr[arr.length - 1];
  const prev = (arr: number[]) => arr[arr.length - 4]; // ~3 bars ago to check rising
  return (
    last(ema9) > last(ema21) &&
    last(ema21) > last(ema50) &&
    last(ema9) > prev(ema9) &&
    last(ema21) > prev(ema21) &&
    last(ema50) > prev(ema50)
  );
}

export function hasEMA921BullishCross(ema9: number[], ema21: number[]): boolean {
  const n = ema9.length;
  if (n < 5) return false;
  // Check if 9 EMA crossed above 21 EMA within the last 4 bars
  for (let i = n - 4; i < n; i++) {
    if (ema9[i] > ema21[i] && ema9[i - 1] <= ema21[i - 1]) return true;
  }
  return false;
}
