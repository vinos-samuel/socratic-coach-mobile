"use client";

import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, Crosshair, ShieldAlert, Target, AlertTriangle } from "lucide-react";
import { MomentumPick, DeepAnalysisRequest } from "@/types";

interface TradeCommentaryProps {
  pick: Pick<MomentumPick, "ticker" | "name" | "price" | "changePct" | "signals" | "tradeSetup" | "rsRating" | "volumeRatio" | "rsi" | "score" | "type" | "ruleBasedCommentary">;
}

const SECTIONS = [
  { key: "SETUP",  label: "Setup",        Icon: TrendingUp,   color: "text-emerald-400", bg: "bg-emerald-500/5",  border: "border-emerald-500/20" },
  { key: "ENTRY",  label: "Entry Trigger", Icon: Crosshair,    color: "text-emerald-300", bg: "bg-emerald-500/5",  border: "border-emerald-500/20" },
  { key: "STOP",   label: "Stop-Loss",     Icon: ShieldAlert,  color: "text-red-400",     bg: "bg-red-500/5",      border: "border-red-500/20"     },
  { key: "TARGET", label: "Target",        Icon: Target,       color: "text-sky-400",     bg: "bg-sky-500/5",      border: "border-sky-500/20"     },
  { key: "RISK",   label: "Key Risk",      Icon: AlertTriangle,color: "text-amber-400",   bg: "bg-amber-500/5",    border: "border-amber-500/20"   },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function parseSections(text: string): Partial<Record<SectionKey, string>> {
  const result: Partial<Record<SectionKey, string>> = {};
  const keys = SECTIONS.map((s) => s.key);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const next = keys[i + 1];
    const pattern = next
      ? new RegExp(`${key}:\\s*(.+?)(?=${next}:)`, "s")
      : new RegExp(`${key}:\\s*(.+)$`, "s");
    const match = text.match(pattern);
    if (match) result[key] = match[1].trim();
  }
  return result;
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

  const sections = deepAnalysis ? parseSections(deepAnalysis) : null;
  const hasSections = sections && Object.keys(sections).length >= 3;

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
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Claude Deep Analysis</span>
          </div>

          {hasSections ? (
            <div className="space-y-2">
              {SECTIONS.map(({ key, label, Icon, color, bg, border }) => {
                const text = sections[key];
                if (!text) return null;
                return (
                  <div key={key} className={`flex gap-3 rounded-lg px-3 py-2.5 border ${bg} ${border}`}>
                    <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${color}`}>{label}</div>
                      <p className="text-[#d1d5db] text-sm leading-relaxed">{text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Fallback: render raw text if model didn't follow the format
            <p className="text-[#d1d5db] text-sm leading-relaxed">{deepAnalysis}</p>
          )}
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
