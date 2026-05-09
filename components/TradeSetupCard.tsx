"use client";

import { useState } from "react";
import { TradeSetup } from "@/types";
import { Target, ShieldAlert, TrendingUp, Scale, Copy, Check } from "lucide-react";

interface TradeSetupCardProps {
  setup: TradeSetup;
  price: number;
  ema9?: number;
}

export function TradeSetupCard({ setup, price, ema9 }: TradeSetupCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const rrColor =
    setup.riskReward >= 2 ? "text-green-400" :
    setup.riskReward >= 1.5 ? "text-amber-400" : "text-red-400";

  function copyValue(label: string, value: number) {
    navigator.clipboard.writeText(value.toFixed(2)).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  }

  const alertLevels = [
    { label: "Stop", value: setup.stopLoss, color: "text-red-400", bg: "bg-red-950/20", border: "border-red-500/20" },
    ...(ema9 ? [{ label: "9 EMA", value: ema9, color: "text-amber-400", bg: "bg-amber-950/20", border: "border-amber-500/20" }] : []),
    { label: "Target", value: setup.target, color: "text-sky-400", bg: "bg-sky-950/20", border: "border-sky-500/20" },
  ];

  return (
    <div className="bg-[#111a14] border border-[#1c2e1e] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
        Trade Setup
      </h3>
      <div className="space-y-3">
        <div className="bg-green-950/40 border-l-4 border-green-500 rounded-r-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">Entry Zone</span>
          </div>
          <div className="text-white font-bold text-lg font-mono">
            ${setup.entryLow.toLocaleString()} – ${setup.entryHigh.toLocaleString()}
          </div>
          <div className="text-[#9ca3af] text-xs mt-1">{setup.entryTrigger}</div>
        </div>

        <div className="bg-blue-950/40 border-l-4 border-blue-500 rounded-r-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide">Target</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-white font-bold text-lg font-mono">${setup.target.toLocaleString()}</span>
            <span className="text-blue-400 font-semibold text-sm">+{setup.targetPct}%</span>
          </div>
          <div className="text-[#9ca3af] text-xs mt-1">Swing trade target</div>
        </div>

        <div className="bg-red-950/40 border-l-4 border-red-500 rounded-r-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-xs font-semibold uppercase tracking-wide">Stop-Loss</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-white font-bold text-lg font-mono">${setup.stopLoss.toLocaleString()}</span>
            <span className="text-red-400 font-semibold text-sm">{setup.stopLossPct}%</span>
          </div>
          <div className="text-[#9ca3af] text-xs mt-1">Below {setup.stopReason}</div>
        </div>

        <div className="flex items-center justify-between bg-[#0d1a10] border border-[#1c2e1e] rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#6b7280]" />
            <span className="text-[#9ca3af] text-sm">Risk / Reward</span>
          </div>
          <span className={`text-lg font-bold font-mono ${rrColor}`}>
            1 : {setup.riskReward.toFixed(2)}
          </span>
        </div>

        <div className="pt-1">
          <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Copy className="w-3 h-3" /> Alert Levels
          </div>
          <div className="space-y-1.5">
            {alertLevels.map(({ label, value, color, bg, border }) => (
              <button
                key={label}
                onClick={() => copyValue(label, value)}
                className={`w-full flex items-center justify-between ${bg} border ${border} rounded-lg px-3 py-2 hover:opacity-80 transition-opacity text-left`}
              >
                <span className="text-[#9ca3af] text-xs">{label}</span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-semibold text-sm ${color}`}>${value.toFixed(2)}</span>
                  <span className={`text-xs w-12 text-right transition-all ${copied === label ? "text-green-400" : "text-[#4b5563]"}`}>
                    {copied === label ? (
                      <span className="flex items-center gap-0.5 justify-end"><Check className="w-3 h-3" /> copied</span>
                    ) : "copy"}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#4b5563] mt-2 leading-relaxed">
            Tap a level to copy the price. Set a Stop Market order in your broker at the Stop level.
          </p>
        </div>
      </div>
    </div>
  );
}
