"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { StockDetailResponse } from "@/types";
import { MomentumSignals } from "@/components/MomentumSignals";
import { TradeSetupCard } from "@/components/TradeSetupCard";
import { TradeCommentary } from "@/components/TradeCommentary";
import { ScoreBadge } from "@/components/ScoreBadge";
import { StockChart } from "@/components/StockChart";

async function fetchCryptoDetail(ticker: string): Promise<StockDetailResponse | null> {
  const res = await fetch(`/api/crypto/${ticker}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default function CryptoDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const upperTicker = ticker.toUpperCase();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<StockDetailResponse | null>({
    queryKey: ["crypto-detail", upperTicker],
    queryFn: () => fetchCryptoDetail(upperTicker),
    staleTime: 4 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="border-b border-[#1e1e2e] bg-[#0d0d14] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {data ? (
            <div className="flex-1 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-xl font-mono">{data.ticker}</span>
                  <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full px-2 py-0.5">CRYPTO</span>
                  <ScoreBadge score={data.score} size="sm" />
                </div>
                <div className="text-[#6b7280] text-xs">{data.name}</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-xl font-mono">
                  ${data.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: data.price > 100 ? 2 : 4 })}
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
          <button onClick={() => refetch()} disabled={isFetching} className="text-[#6b7280] hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-[#6b7280] text-sm">Loading {upperTicker} analysis...</p>
        </div>
      )}

      {isError && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/30 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{(error as Error)?.message}</p>
          </div>
        </div>
      )}

      {data && (
        <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          <StockChart data={data} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TradeSetupCard setup={data.tradeSetup} price={data.price} />
            <MomentumSignals signals={data.signals} />
          </div>
          <TradeCommentary pick={{ ticker: data.ticker, name: data.name, price: data.price, changePct: data.changePct, signals: data.signals, tradeSetup: data.tradeSetup, rsRating: data.rsRating, volumeRatio: data.volumeRatio, rsi: data.rsi, score: data.score, type: "crypto", ruleBasedCommentary: data.ruleBasedCommentary }} />
          <p className="text-[#4b5563] text-xs text-center pb-6 leading-relaxed">
            Not financial advice. Crypto is highly volatile. Always use a stop-loss.
          </p>
        </main>
      )}
    </div>
  );
}
