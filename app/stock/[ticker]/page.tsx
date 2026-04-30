"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { StockDetailResponse } from "@/types";
import { StockChart } from "@/components/StockChart";
import { MomentumSignals } from "@/components/MomentumSignals";
import { TradeSetupCard } from "@/components/TradeSetupCard";
import { TradeCommentary } from "@/components/TradeCommentary";
import { ScoreBadge } from "@/components/ScoreBadge";

async function fetchStockDetail(ticker: string): Promise<StockDetailResponse> {
  const res = await fetch(`/api/stock/${ticker}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch stock data");
  return res.json();
}

export default function StockDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const upperTicker = ticker.toUpperCase();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<StockDetailResponse>({
    queryKey: ["stock", upperTicker],
    queryFn: () => fetchStockDetail(upperTicker),
    staleTime: 4 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-[#0d1210]">
      {/* Header */}
      <header className="border-b border-[#1c2e1e] bg-[#0d1210] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {data ? (
            <div className="flex-1 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-xl font-mono">{data.ticker}</span>
                  <ScoreBadge score={data.score} size="sm" />
                </div>
                <div className="text-[#6b7280] text-xs truncate max-w-[200px]">{data.name}</div>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-white font-bold text-xl font-mono">
                    ${data.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-mono px-1 py-0.5 rounded ${data.priceSource === "live" ? "bg-emerald-500/20 text-emerald-400" : "bg-[#1c2e1e] text-[#6b7280]"}`}>
                    {data.priceSource === "live" ? "~15 min" : `EOD ${data.dataAsOf}`}
                  </span>
                </div>
                <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${data.changePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {data.changePct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {data.changePct >= 0 ? "+" : ""}{data.changePct.toFixed(2)}%
                </div>
              </div>
            </div>
          ) : (
            <span className="text-white font-bold text-xl font-mono">{upperTicker}</span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-[#6b7280] hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-[#6b7280] text-sm">Loading {upperTicker} analysis...</p>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/30 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Failed to load {upperTicker}</p>
              <p className="text-[#9ca3af] text-xs mt-1">{(error as Error)?.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {data && (
        <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          {/* Chart */}
          <StockChart data={data} />

          {/* Two-col layout on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TradeSetupCard setup={data.tradeSetup} price={data.price} />
            <MomentumSignals signals={data.signals} />
          </div>

          {/* Full-width commentary */}
          <TradeCommentary pick={{ ticker: data.ticker, name: data.name, price: data.price, changePct: data.changePct, signals: data.signals, tradeSetup: data.tradeSetup, rsRating: data.rsRating, volumeRatio: data.volumeRatio, rsi: data.rsi, score: data.score, type: "stock", ruleBasedCommentary: data.ruleBasedCommentary }} />

          <p className="text-[#4b5563] text-xs text-center pb-6 leading-relaxed">
            Picks scored using RS Rating, EMA stack (9/21/50), volume surge, RSI zone, and anchored VWAP. For informational purposes only. Not financial advice. Past momentum does not guarantee future results. Always manage risk with a defined stop-loss.
          </p>
        </main>
      )}
    </div>
  );
}
