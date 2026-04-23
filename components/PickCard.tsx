"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";
import { MomentumPick } from "@/types";
import { Sparkline } from "./Sparkline";
import { ScoreBadge } from "./ScoreBadge";

interface PickCardProps {
  pick: MomentumPick;
  rank: number;
}

export function PickCard({ pick, rank }: PickCardProps) {
  const positive = pick.changePct >= 0;
  const priceColor = positive ? "text-green-400" : "text-red-400";
  const href = pick.type === "crypto" ? `/crypto/${pick.ticker}` : `/stock/${pick.ticker}`;

  const topSignals = pick.signals.filter((s) => s.status === "pass").slice(0, 3);

  return (
    <Link href={href}>
      <div className="group relative bg-[#111a14] border border-[#1c2e1e] rounded-xl p-4 hover:border-emerald-500/50 hover:bg-[#132018] transition-all duration-200 cursor-pointer active:scale-[0.98]">
        {/* Rank badge */}
        <div className="absolute top-3 right-3 text-xs font-mono text-[#6b7280]">#{rank}</div>

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg font-mono">{pick.ticker}</span>
              {pick.type === "crypto" && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">CRYPTO</span>
              )}
            </div>
            <div className="text-[#6b7280] text-xs mt-0.5 truncate max-w-[140px]">{pick.name}</div>
          </div>
          <ScoreBadge score={pick.score} size="sm" />
        </div>

        {/* Price row */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-white font-bold text-xl font-mono">
            ${pick.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: pick.price > 100 ? 2 : 4 })}
          </span>
          <span className={`text-sm font-semibold flex items-center gap-0.5 ${priceColor}`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {positive ? "+" : ""}{pick.changePct.toFixed(2)}%
          </span>
        </div>

        {/* Sparkline */}
        <div className="mb-3 opacity-90">
          <Sparkline data={pick.sparkline} positive={positive} width={200} height={44} />
        </div>

        {/* Signal chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topSignals.map((sig) => (
            <span
              key={sig.name}
              className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-md px-2 py-0.5 font-medium"
            >
              ✓ {sig.label}
            </span>
          ))}
          {pick.emaCross921 && (
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md px-2 py-0.5 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" /> Cross
            </span>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-[#1c2e1e] pt-3">
          <div>
            <div className="text-[#6b7280]">RS</div>
            <div className="text-white font-mono font-semibold">{pick.rsRating}</div>
          </div>
          <div>
            <div className="text-[#6b7280]">Vol</div>
            <div className={`font-mono font-semibold ${pick.volumeRatio >= 2 ? "text-green-400" : pick.volumeRatio >= 1.5 ? "text-amber-400" : "text-white"}`}>
              {pick.volumeRatio.toFixed(1)}x
            </div>
          </div>
          <div>
            <div className="text-[#6b7280]">RSI</div>
            <div className={`font-mono font-semibold ${pick.rsi >= 55 && pick.rsi <= 80 ? "text-green-400" : pick.rsi > 80 ? "text-red-400" : "text-white"}`}>
              {pick.rsi.toFixed(0)}
            </div>
          </div>
        </div>

        {/* CTA hint */}
        <div className="mt-3 text-xs text-[#6b7280] group-hover:text-emerald-400 transition-colors text-center">
          View full analysis →
        </div>
      </div>
    </Link>
  );
}
