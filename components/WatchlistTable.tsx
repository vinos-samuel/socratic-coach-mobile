"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { MomentumPick, TradeSetup } from "@/types";

interface LiveEntry {
  price: number;
  changePct: number;
  dayVolume: number;
  normalizedVolRatio: number | null;
}

interface WatchlistTableProps {
  picks: MomentumPick[];
  onWatchlistChange: () => void;
}

type RowStatus = "BREAKOUT" | "AT_ZONE" | "WATCH" | "STOP_HIT";

const STATUS_ORDER: Record<RowStatus, number> = {
  BREAKOUT: 0,
  AT_ZONE: 1,
  WATCH: 2,
  STOP_HIT: 3,
};

function getStatus(price: number, setup: TradeSetup): RowStatus {
  if (price <= setup.stopLoss) return "STOP_HIT";
  if (price > setup.entryHigh) return "BREAKOUT";
  if (price >= setup.entryLow * 0.99) return "AT_ZONE";
  return "WATCH";
}

function StatusBadge({ status }: { status: RowStatus }) {
  switch (status) {
    case "BREAKOUT":
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">BREAKOUT</span>;
    case "AT_ZONE":
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">AT ZONE</span>;
    case "STOP_HIT":
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">STOP HIT</span>;
    default:
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#1c2e1e] text-[#6b7280] border border-[#2a3f2e]">WATCH</span>;
  }
}

function volColor(r: number): string {
  if (r >= 2) return "text-green-400";
  if (r >= 1.5) return "text-amber-400";
  if (r >= 1) return "text-white";
  return "text-[#6b7280]";
}

function formatVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return `${v}`;
}

export function WatchlistTable({ picks, onWatchlistChange }: WatchlistTableProps) {
  const [liveData, setLiveData] = useState<Record<string, LiveEntry>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [minutesInSession, setMinutesInSession] = useState(0);
  const [marketOpen, setMarketOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!picks.length) return;
    setLoading(true);
    try {
      const avgVolumes: Record<string, number> = {};
      for (const p of picks) {
        if (p.avgDailyVolume) avgVolumes[p.ticker] = p.avgDailyVolume;
      }
      const res = await fetch("/api/watchlist-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: picks.map((p) => p.ticker), avgVolumes }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiveData(data.tickers ?? {});
        setLastUpdated(data.lastUpdated ?? null);
        setMinutesInSession(data.minutesInSession ?? 0);
        setMarketOpen(data.marketOpen ?? false);
      }
    } catch {
      // silent — table stays on stale data
    } finally {
      setLoading(false);
    }
  }, [picks]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  function removePick(ticker: string) {
    try {
      const saved = localStorage.getItem("watchlist");
      let stored: MomentumPick[] = saved ? JSON.parse(saved) : [];
      stored = stored.filter((p) => p.ticker !== ticker);
      localStorage.setItem("watchlist", JSON.stringify(stored));
      onWatchlistChange();
    } catch { /* ignore */ }
  }

  const rows = picks
    .map((pick) => {
      const live = liveData[pick.ticker];
      const price = live?.price ?? pick.price;
      const changePct = live?.changePct ?? pick.changePct;
      const volRatio = live?.normalizedVolRatio ?? null;
      const status = getStatus(price, pick.tradeSetup);
      const distPct = ((pick.tradeSetup.entryHigh - price) / price) * 100;
      return { pick, price, changePct, volRatio, status, distPct, live };
    })
    .sort((a, b) => {
      const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      return sd !== 0 ? sd : a.distPct - b.distPct;
    });

  const sessionLabel = minutesInSession >= 390 ? "Market closed"
    : minutesInSession > 0 ? `${minutesInSession}min into session`
    : "Pre-market / closed";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
          marketOpen ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-[#1c2e1e] text-[#6b7280] border-[#2a3f2e]"
        }`}>
          {marketOpen ? "● " : "○ "}{sessionLabel}
        </span>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[#4b5563]">
              {new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore" })} SGT
            </span>
          )}
          <button onClick={refresh} disabled={loading} className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-emerald-400 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1c2e1e]">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-[#1c2e1e] bg-[#0d1a10]">
              {["Ticker", "Price", "Chg%", "Entry Zone", "Dist to Entry", "Vol (norm)", "RSI", "Stop", "Target", "R:R", "Status", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-xs font-semibold text-[#6b7280] uppercase tracking-wider text-left first:text-left [&:not(:first-child)]:text-right last:text-center">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ pick, price, changePct, volRatio, status, distPct, live }) => {
              const positive = changePct >= 0;
              const href = pick.type === "crypto" ? `/crypto/${pick.ticker}` : `/stock/${pick.ticker}`;
              const highlight = status === "BREAKOUT" || status === "AT_ZONE";
              return (
                <tr key={pick.ticker} className={`border-b border-[#1c2e1e] last:border-0 transition-colors hover:bg-[#132018] ${highlight ? "bg-[#0f1f12]" : ""}`}>
                  <td className="px-3 py-3">
                    <Link href={href} className="flex flex-col">
                      <span className="font-bold font-mono text-white leading-none">{pick.ticker}</span>
                      <span className="text-[10px] text-[#6b7280] truncate max-w-[80px] mt-0.5">{pick.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-white">
                    ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: price > 100 ? 2 : 4 })}
                  </td>
                  <td className={`px-3 py-3 text-right font-mono text-sm font-semibold ${positive ? "text-green-400" : "text-red-400"}`}>
                    <span className="flex items-center justify-end gap-0.5">
                      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {positive ? "+" : ""}{changePct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-sky-300">
                    ${pick.tradeSetup.entryLow.toFixed(2)}–${pick.tradeSetup.entryHigh.toFixed(2)}
                  </td>
                  <td className={`px-3 py-3 text-right font-mono text-xs ${
                    distPct < 0 ? "text-green-400 font-bold" : distPct < 1 ? "text-amber-400 font-semibold" : "text-[#9ca3af]"
                  }`}>
                    {distPct < 0 ? `+${Math.abs(distPct).toFixed(1)}% above` : distPct < 0.5 ? `${distPct.toFixed(1)}% ⚡` : `${distPct.toFixed(1)}% away`}
                  </td>
                  <td className={`px-3 py-3 text-right font-mono text-sm font-semibold ${
                    volRatio !== null ? volColor(volRatio) : live?.dayVolume ? "text-[#6b7280]" : "text-[#4b5563]"
                  }`}>
                    {volRatio !== null
                      ? `${volRatio.toFixed(1)}x`
                      : live?.dayVolume
                      ? formatVol(live.dayVolume)
                      : "—"}
                  </td>
                  <td className={`px-3 py-3 text-right font-mono text-sm ${
                    pick.rsi >= 55 && pick.rsi <= 80 ? "text-green-400" : pick.rsi > 80 ? "text-red-400" : "text-white"
                  }`}>{pick.rsi.toFixed(0)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-red-400">${pick.tradeSetup.stopLoss.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-sky-400">${pick.tradeSetup.target.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-white">1:{pick.tradeSetup.riskReward.toFixed(1)}</td>
                  <td className="px-3 py-3 text-right"><StatusBadge status={status} /></td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => removePick(pick.ticker)} className="text-amber-400 hover:text-[#6b7280] transition-colors text-sm leading-none" aria-label="Remove from watchlist">★</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-[#4b5563] mt-3 leading-relaxed">
        Vol is time-normalized: intraday volume ÷ (20d avg × % of session elapsed). A 2x reading early in session is far stronger than 2x near close. Raw volume shown (M/K) when avg not available.
        Auto-refreshes every 60s. Click any row to open the full chart. ★ to remove.
      </p>
    </div>
  );
}
