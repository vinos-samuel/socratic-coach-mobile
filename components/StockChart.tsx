"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  UTCTimestamp,
} from "lightweight-charts";
import { StockDetailResponse } from "@/types";

interface StockChartProps {
  data: StockDetailResponse;
}

const OVERLAYS = [
  { key: "ema9", label: "9 EMA", color: "#f59e0b" },
  { key: "ema21", label: "21 EMA", color: "#34d399" },
  { key: "ema50", label: "50 EMA", color: "#ec4899" },
  { key: "vwap", label: "VWAP", color: "#22d3ee" },
] as const;

type OverlayKey = (typeof OVERLAYS)[number]["key"];

export function StockChart({ data }: StockChartProps) {
  const priceRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const priceChart = useRef<IChartApi | null>(null);
  const rsiChart = useRef<IChartApi | null>(null);
  const volChart = useRef<IChartApi | null>(null);
  const [active, setActive] = useState<Set<OverlayKey>>(new Set(["ema9", "ema21", "ema50", "vwap"]));
  const overlaySeries = useRef<Partial<Record<OverlayKey, ISeriesApi<"Line">>>>({});

  const chartOptions = {
    layout: { background: { type: ColorType.Solid, color: "#111a14" }, textColor: "#9ca3af" },
    grid: { vertLines: { color: "#1c2e1e" }, horzLines: { color: "#1c2e1e" } },
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: { borderColor: "#1c2e1e" },
    timeScale: { borderColor: "#1c2e1e", timeVisible: true },
  };

  useEffect(() => {
    if (!priceRef.current || !rsiRef.current || !volRef.current) return;

    // Price chart
    priceChart.current = createChart(priceRef.current, { ...chartOptions, height: 320 });
    const candleSeries = priceChart.current.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    const t = (n: number) => n as UTCTimestamp;
    candleSeries.setData(data.bars.map((b) => ({ time: t(b.time), open: b.open, high: b.high, low: b.low, close: b.close })));

    // Overlay EMAs / VWAP
    const seriesMap: Record<OverlayKey, { data: Array<{ time: number; value: number }>; color: string }> = {
      ema9: { data: data.ema9Series, color: "#f59e0b" },
      ema21: { data: data.ema21Series, color: "#34d399" },
      ema50: { data: data.ema50Series, color: "#ec4899" },
      vwap: { data: data.vwapSeries, color: "#22d3ee" },
    };
    for (const [key, { data: sData, color }] of Object.entries(seriesMap) as [OverlayKey, { data: Array<{ time: number; value: number }>; color: string }][]) {
      const series = priceChart.current.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      series.setData(sData.map((d) => ({ time: t(d.time), value: d.value })));
      overlaySeries.current[key] = series;
    }
    priceChart.current.timeScale().fitContent();

    // RSI chart
    rsiChart.current = createChart(rsiRef.current, { ...chartOptions, height: 100 });
    const rsiLine = rsiChart.current.addSeries(LineSeries, { color: "#34d399", lineWidth: 1, priceLineVisible: false });
    rsiLine.setData(data.rsiSeries.map((d) => ({ time: t(d.time), value: d.value })));
    // RSI bands
    const upper = rsiChart.current.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const lower = rsiChart.current.addSeries(LineSeries, { color: "#22c55e", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    if (data.rsiSeries.length > 0) {
      upper.setData(data.rsiSeries.map((d) => ({ time: t(d.time), value: 80 })));
      lower.setData(data.rsiSeries.map((d) => ({ time: t(d.time), value: 55 })));
    }
    rsiChart.current.timeScale().fitContent();

    // Volume chart
    volChart.current = createChart(volRef.current, { ...chartOptions, height: 110 });
    const volSeries = volChart.current.addSeries(HistogramSeries, { color: "#22c55e33" });
    volSeries.setData(data.volumeSeries.map((d) => ({ time: t(d.time), value: d.value, color: d.color })));
    const avgLine = volChart.current.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    if (data.volumeSeries.length > 0) {
      avgLine.setData(data.volumeSeries.map((d) => ({ time: t(d.time), value: data.avgVolumeLine })));
    }
    volChart.current.timeScale().fitContent();

    // Sync timescales
    const syncHandler = (range: { from: number; to: number } | null) => {
      if (!range) return;
      rsiChart.current?.timeScale().setVisibleLogicalRange(range);
      volChart.current?.timeScale().setVisibleLogicalRange(range);
    };
    priceChart.current.timeScale().subscribeVisibleLogicalRangeChange(syncHandler);

    const handleResize = () => {
      const w = priceRef.current?.clientWidth ?? 600;
      priceChart.current?.applyOptions({ width: w });
      rsiChart.current?.applyOptions({ width: w });
      volChart.current?.applyOptions({ width: w });
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      priceChart.current?.remove();
      rsiChart.current?.remove();
      volChart.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function toggleOverlay(key: OverlayKey) {
    const next = new Set(active);
    if (next.has(key)) {
      next.delete(key);
      overlaySeries.current[key]?.applyOptions({ visible: false });
    } else {
      next.add(key);
      overlaySeries.current[key]?.applyOptions({ visible: true });
    }
    setActive(next);
  }

  return (
    <div className="bg-[#111a14] border border-[#1c2e1e] rounded-xl overflow-hidden">
      {/* Overlay toggles */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-[#1c2e1e]">
        {OVERLAYS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggleOverlay(key)}
            className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
              active.has(key)
                ? "border-transparent text-[#0d1210]"
                : "border-[#1c2e1e] text-[#6b7280] bg-transparent"
            }`}
            style={active.has(key) ? { backgroundColor: color } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Price chart */}
      <div ref={priceRef} className="w-full" />

      {/* RSI label + chart */}
      <div className="border-t border-[#1c2e1e]">
        <div className="px-4 py-1 text-xs text-[#6b7280] font-medium">RSI (14)</div>
        <div ref={rsiRef} className="w-full" />
      </div>

      {/* Volume label + chart */}
      <div className="border-t border-[#1c2e1e]">
        <div className="px-4 py-1 text-xs text-[#6b7280] font-medium">Volume</div>
        <div ref={volRef} className="w-full" />
      </div>
    </div>
  );
}
