import { NextResponse } from "next/server";
import { getCoinbaseDailyCandles, TOP_CRYPTO_PAIRS } from "@/lib/coinbase";
import { scoreBars } from "@/lib/scoring";
import { calculateEMA, calculateRSI, calculateAnchoredVWAP } from "@/lib/indicators";
import { OHLCVBar, StockDetailResponse } from "@/types";

export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const upperTicker = ticker.toUpperCase();
  const productId = `${upperTicker}-USD`;
  const pair = TOP_CRYPTO_PAIRS.find((p) => p.productId === productId);

  try {
    const candles = await getCoinbaseDailyCandles(productId, 100);
    if (candles.length < 55) return NextResponse.json({ error: "Insufficient data" }, { status: 400 });

    const bars: OHLCVBar[] = candles;
    const closes = bars.map((b) => b.close);
    const volumes = bars.map((b) => b.volume);

    const ema9arr = calculateEMA(closes, 9);
    const ema21arr = calculateEMA(closes, 21);
    const ema50arr = calculateEMA(closes, 50);
    const rsiArr = calculateRSI(closes, 14);
    const vwap = calculateAnchoredVWAP(bars);

    const scored = scoreBars(bars, bars, upperTicker, pair?.name ?? upperTicker);
    if (!scored) return NextResponse.json({ error: "Scoring failed" }, { status: 400 });

    const avgVol = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;

    const toSeries = (arr: number[]) =>
      bars.map((b, i) => ({ time: b.time, value: isNaN(arr[i]) ? null : +arr[i].toFixed(6) })).filter((x) => x.value !== null) as Array<{ time: number; value: number }>;

    const price = bars[bars.length - 1].close;
    const prevPrice = bars[bars.length - 2]?.close ?? price;
    const change = price - prevPrice;
    const changePct = (change / prevPrice) * 100;

    const response: StockDetailResponse = {
      ticker: upperTicker,
      name: pair?.name ?? upperTicker,
      price: +price.toFixed(4),
      change: +change.toFixed(4),
      changePct: +changePct.toFixed(2),
      score: scored.score,
      bars,
      ema9Series: toSeries(ema9arr),
      ema21Series: toSeries(ema21arr),
      ema50Series: toSeries(ema50arr),
      vwapSeries: vwap ? bars.slice(-40).map((b) => ({ time: b.time, value: +vwap.toFixed(6) })) : [],
      rsiSeries: toSeries(rsiArr),
      volumeSeries: bars.map((b, i) => ({
        time: b.time,
        value: b.volume,
        color: b.close >= (bars[i - 1]?.close ?? b.close) ? "#22c55e99" : "#ef444499",
      })),
      avgVolumeLine: +avgVol.toFixed(4),
      signals: scored.signals,
      tradeSetup: scored.tradeSetup,
      ruleBasedCommentary: scored.ruleBasedCommentary,
      rsRating: scored.rsRating,
      volumeRatio: scored.volumeRatio,
      rsi: scored.rsi,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Crypto detail error:", error);
    return NextResponse.json({ error: "Failed to fetch crypto data" }, { status: 500 });
  }
}
