"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { MomentumPick, DeepAnalysisRequest } from "@/types";

interface TradeCommentaryProps {
  pick: Pick<MomentumPick, "ticker" | "name" | "price" | "changePct" | "signals" | "tradeSetup" | "rsRating" | "volumeRatio" | "rsi" | "score" | "type" | "ruleBasedCommentary">;
}

export function TradeCommentary({ pick }: TradeCommentaryProps) {
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchDeepAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const req: DeepAnalysisRequest = {
        ticker: pick.ticker,
        name: pick.name,
        price: pick.price,
        changePct: pick.changePct,
        signals: pick.signals,
        tradeSetup: pick.tradeSetup,
        rsRating: pick.rsRating,
        volumeRatio: pick.volumeRatio,
        rsi: pick.rsi,
        score: pick.score,
        type: pick.type,
      };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setDeepAnalysis(data.analysis);
    } catch {
      setError("Failed to get deep analysis. Check your ANTHROPIC_API_KEY.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#111a14] border border-[#1c2e1e] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
        AI Analysis
      </h3>

      {/* Rule-based commentary */}
      <p className="text-[#d1d5db] text-sm leading-relaxed mb-4">
        {pick.ruleBasedCommentary}
      </p>

      {/* Deep analysis result */}
      {deepAnalysis && (
        <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Claude Deep Analysis</span>
          </div>
          <p className="text-[#e2e8f0] text-sm leading-relaxed italic">{deepAnalysis}</p>
        </div>
      )}

      {error && (
        <div className="text-red-400 text-xs mb-3 bg-red-950/30 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Deep analysis button */}
      {!deepAnalysis && (
        <button
          onClick={fetchDeepAnalysis}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-950 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 px-4 text-sm transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analysing with Claude...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Deep Analysis — Ask Claude
            </>
          )}
        </button>
      )}
    </div>
  );
}
