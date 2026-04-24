import { NextResponse } from "next/server";
import { getDailyBars, getTickerDetails, getLastTradePrice } from "@/lib/polygon";
import { scoreBars } from "@/lib/scoring";
import { calculateEMA, calculateRSI, calculateAnchoredVWAP } from "@/lib/indicators";
import { OHLCVBar, StockDetailResponse } from "@/types";

export const dynamic = "force-dynamic";

function polygonToOHLCV(bar: { t: number; o: number; h: number; l: number; c: number; v: number }): OHLCVBar {
  return { time: Math.floor(bar.t / 1000), open: bar.o, high: bar.h, low: bar.l, close: bar.c, volume: bar.v };
}

export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  try {
    const [rawBars, spyRaw, details, livePrice] = await Promise.all([
      getDailyBars(ticker, 252),
      getDailyBars("SPY", 252),
      getTickerDetails(ticker).catch(() => ({ name: ticker })),
      getLastTradePrice(ticker),
    ]);

    const bars = rawBars.map(polygonToOHLCV);
    const spyBars = spyRaw.map(polygonToOHLCV);
    const closes = bars.map((b) => b.close);
    const volumes = bars.map((b) => b.volume);

    const ema9arr = calculateEMA(closes, 9);
    const ema21arr = calculateEMA(closes, 21);
    const ema50arr = calculateEMA(closes, 50);
    const rsiArr = calculateRSI(closes, 14);
    const vwap = calculateAnchoredVWAP(bars);

    const scored = scoreBars(bars, spyBars, ticker, details.name);
    if (!scored) return NextResponse.json({ error: "Insufficient data" }, { status: 400 });

    const avgVol = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;

    const toSeries = (arr: number[]) =>
      bars
        .map((b, i) => ({ time: b.time, value: isNaN(arr[i]) ? null : +arr[i].toFixed(4) }))
        .filter((x) => x.value !== null) as Array<{ time: number; value: number }>;

    const lastBar = bars[bars.length - 1];
    const prevClose = bars[bars.length - 2]?.close ?? lastBar.close;
    const eodPrice = lastBar.close;
    const displayPrice = livePrice ?? eodPrice;
    const change = displayPrice - prevClose;
    const changePct = (change / prevClose) * 100;
    const dataAsOf = new Date(lastBar.time * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const response: StockDetailResponse = {
      ticker,
      name: details.name,
      price: +displayPrice.toFixed(2),
      change: +change.toFixed(2),
      changePct: +changePct.toFixed(2),
      score: scored.score,
      bars,
      ema9Series: toSeries(ema9arr),
      ema21Series: toSeries(ema21arr),
      ema50Series: toSeries(ema50arr),
      vwapSeries: vwap ? bars.slice(-40).map((b) => ({ time: b.time, value: +vwap.toFixed(4) })) : [],
      rsiSeries: toSeries(rsiArr),
      volumeSeries: bars.map((b, i) => ({
        time: b.time,
        value: b.volume,
        color: b.close >= (bars[i - 1]?.close ?? b.close) ? "#22c55e99" : "#ef444499",
      })),
      avgVolumeLine: +avgVol.toFixed(0),
      signals: scored.signals,
      tradeSetup: scored.tradeSetup,
      ruleBasedCommentary: scored.ruleBasedCommentary,
      rsRating: scored.rsRating,
      volumeRatio: scored.volumeRatio,
      rsi: scored.rsi,
      livePrice: livePrice ? +livePrice.toFixed(2) : undefined,
      priceSource: livePrice ? "live" : "eod",
      dataAsOf,
    };

    return NextResponse.json(response, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Stock detail error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
