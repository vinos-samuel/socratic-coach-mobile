"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Zap, AlertCircle, RefreshCw, FlameKindling, FlaskConical } from "lucide-react";
import { ScannerResponse } from "@/types";
import { PickCard } from "@/components/PickCard";
import { MarketStatus } from "@/components/MarketStatus";

type Tab = "stocks" | "smallcap" | "crypto" | "speculative";

const TABS: { id: Tab; label: string; api: string }[] = [
  { id: "stocks",      label: "🇺🇸 Large Cap",  api: "/api/scanner"     },
  { id: "smallcap",   label: "⚡ Small Cap",    api: "/api/smallcap"    },
  { id: "crypto",     label: "₿ Crypto 4H",    api: "/api/crypto"      },
  { id: "speculative", label: "🎯 Speculative", api: "/api/speculative" },
];

const DISCLAIMERS: Record<Tab, string> = {
  stocks: "Picks scored 0–100 vs S&P 500 using RS Rating, EMA stack (9/21/50), volume surge, RSI zone (55–80), and anchored VWAP. Score threshold: 65.",
  smallcap: "Picks scored 0–100 vs Russell 2000 (IWM). Score threshold: 55. Small caps carry significantly higher volatility and liquidity risk — position size smaller than large caps. Use wider stops and tighter position limits.",
  crypto: "Picks scored using 4-hour candles (22 pairs) vs Bitcoin baseline. Crypto is highly volatile and trades 24/7. Past momentum does not guarantee future results.",
  speculative: "Speculative picks scored using VCP (Volatility Contraction Pattern) + Stage 1→2 EMA 50 recovery signals. These are beaten-down stocks showing early base-building. Score threshold: 40. HIGH RISK — use 1/2 normal position size, honour your stop-loss, and expect higher failure rate than large-cap momentum picks.",
};

async function fetchScanner(tab: Tab, forceRefresh = false): Promise<ScannerResponse> {
  const base = TABS.find((t) => t.id === tab)!.api;
  const url = forceRefresh ? `${base}?refresh=1` : base;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch picks");
  return json;
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("stocks");
  const [forceRefresh, setForceRefresh] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ScannerResponse>({
    queryKey: ["scanner", tab],
    queryFn: () => fetchScanner(tab, forceRefresh),
    staleTime: 29 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  function handleRefresh() {
    const lockedUntil = data?.scanLockedUntil ? new Date(data.scanLockedUntil).getTime() : 0;
    const isLocked = Date.now() < lockedUntil;
    setForceRefresh(!isLocked);
    refetch();
    setForceRefresh(false);
  }

  const scanLabel = tab === "stocks" ? "S&P 500 large caps"
    : tab === "smallcap" ? "small cap universe"
    : tab === "crypto" ? "top crypto pairs (4H)"
    : "speculative universe";

  return (
    <div className="min-h-screen bg-[#0d1210]">
      {/* Top nav */}
      <header className="border-b border-[#1c2e1e] bg-[#0d1210]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <span className="text-white font-bold text-lg tracking-tight">Stock Cur8d</span>
          </div>
          <div className="text-xs text-[#6b7280]">1-2 Day Trades</div>
        </div>
      </header>

      {/* Market status bar */}
      {data && (
        <MarketStatus
          marketOpen={data.marketOpen}
          lastUpdated={data.lastUpdated}
          scanLockedUntil={data.scanLockedUntil}
          onRefresh={handleRefresh}
          isRefreshing={isFetching}
        />
      )}

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#111a14] border border-[#1c2e1e] rounded-xl p-1 mb-6 w-fit">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === id
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-[#6b7280] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center gap-2 mb-4">
          {tab === "smallcap"
            ? <FlameKindling className="w-5 h-5 text-amber-400" />
            : tab === "speculative"
            ? <FlaskConical className="w-5 h-5 text-purple-400" />
            : <TrendingUp className="w-5 h-5 text-emerald-400" />
          }
          <h1 className="text-white font-bold text-xl">
            {tab === "stocks" ? "Large Cap Momentum"
              : tab === "smallcap" ? "Small Cap Runners"
              : tab === "crypto" ? "Crypto Momentum (4H)"
              : "Speculative Setups"}
          </h1>
          {data?.picks && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2.5 py-0.5 font-medium">
              {data.picks.length} picks
            </span>
          )}
        </div>

        {/* Small cap risk callout */}
        {tab === "smallcap" && (
          <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 mb-5">
            <FlameKindling className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300/80 text-xs leading-relaxed">
              Higher reward, higher risk. Small caps can move 10–30% in a single session.
              Use smaller position sizes, honour your stop-loss, and never chase a breakout more than 2% above the entry zone.
            </p>
          </div>
        )}

        {/* Speculative risk callout */}
        {tab === "speculative" && (
          <div className="flex items-start gap-3 bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 mb-5">
            <FlaskConical className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-purple-300/80 text-xs leading-relaxed">
              VCP / Stage 1→2 setups — beaten-down stocks showing ATR compression and EMA 50 recovery.
              These have higher failure rates than large-cap momentum. Use <strong className="text-purple-300">half normal position size</strong>, wider stops (6–8%), and target 15–25% gains over 2–6 weeks.
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-[#6b7280] text-sm">Scanning momentum across {scanLabel}...</p>
            <p className="text-[#4b5563] text-xs">This takes ~20s on first load</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/30 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Scanner error</p>
              <p className="text-[#9ca3af] text-xs mt-1 font-mono">{(error as Error)?.message}</p>
              <p className="text-[#6b7280] text-xs mt-2">Check that POLYGON_API_KEY is set in Vercel → Settings → Environment Variables, then redeploy.</p>
            </div>
          </div>
        )}

        {/* No picks */}
        {!isLoading && !isError && data?.picks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#6b7280] text-base">No setups found right now.</p>
            <p className="text-[#4b5563] text-sm mt-2">
              {tab === "smallcap"
                ? "Score threshold is 55 vs Russell 2000. Conditions may be choppy."
                : tab === "speculative"
                ? "Score threshold is 40 on VCP/Stage 1→2 criteria. No stocks show sufficient ATR compression or EMA 50 recovery right now."
                : "The scanner requires score ≥ 65. Market conditions may be choppy."}
            </p>
          </div>
        )}

        {/* Pick grid */}
        {data?.picks && data.picks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.picks.map((pick, i) => (
              <PickCard key={pick.ticker} pick={pick} rank={i + 1} />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[#4b5563] text-xs text-center mt-10 leading-relaxed">
          {DISCLAIMERS[tab]} For informational purposes only. Not financial advice.
          Past momentum does not guarantee future results. Always manage risk with a defined stop-loss.
        </p>
      </main>
    </div>
  );
}
