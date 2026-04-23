"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { ScannerResponse } from "@/types";
import { PickCard } from "@/components/PickCard";
import { MarketStatus } from "@/components/MarketStatus";

type Tab = "stocks" | "crypto";

async function fetchScanner(tab: Tab): Promise<ScannerResponse> {
  const url = tab === "crypto" ? "/api/crypto" : "/api/scanner";
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch picks");
  return json;
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("stocks");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ScannerResponse>({
    queryKey: ["scanner", tab],
    queryFn: () => fetchScanner(tab),
    staleTime: 4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

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
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />
      )}

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#111a14] border border-[#1c2e1e] rounded-xl p-1 mb-6 w-fit">
          {(["stocks", "crypto"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                tab === t
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-[#6b7280] hover:text-white"
              }`}
            >
              {t === "stocks" ? "🇺🇸 Stocks" : "₿ Crypto"}
            </button>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h1 className="text-white font-bold text-xl">Top Momentum Picks</h1>
          {data?.picks && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2.5 py-0.5 font-medium">
              {data.picks.length} picks
            </span>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-[#6b7280] text-sm">Scanning momentum across {tab === "stocks" ? "S&P 500" : "top crypto"}...</p>
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
            <p className="text-[#6b7280] text-base">No high-conviction setups found right now.</p>
            <p className="text-[#4b5563] text-sm mt-2">The scanner requires score ≥ 55. Market conditions may be choppy.</p>
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
          Picks are scored 0–100 using RS Rating vs S&P 500, EMA stack alignment (9/21/50), volume surge, RSI zone (55–80), and anchored VWAP.
          For informational purposes only. Not financial advice. Past momentum does not guarantee future results.
          Always manage risk with a defined stop-loss.
        </p>
      </main>
    </div>
  );
}
