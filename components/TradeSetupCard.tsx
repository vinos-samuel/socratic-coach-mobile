import { TradeSetup } from "@/types";
import { Target, ShieldAlert, TrendingUp, Scale } from "lucide-react";

interface TradeSetupCardProps {
  setup: TradeSetup;
  price: number;
}

export function TradeSetupCard({ setup, price }: TradeSetupCardProps) {
  const rrColor =
    setup.riskReward >= 2 ? "text-green-400" :
    setup.riskReward >= 1.5 ? "text-amber-400" : "text-red-400";

  return (
    <div className="bg-[#111a14] border border-[#1c2e1e] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
        Trade Setup
      </h3>
      <div className="space-y-3">
        {/* Entry */}
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

        {/* Target */}
        <div className="bg-blue-950/40 border-l-4 border-blue-500 rounded-r-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide">Target</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-white font-bold text-lg font-mono">${setup.target.toLocaleString()}</span>
            <span className="text-blue-400 font-semibold text-sm">+{setup.targetPct}%</span>
          </div>
          <div className="text-[#9ca3af] text-xs mt-1">1-2 day momentum target</div>
        </div>

        {/* Stop loss */}
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

        {/* R:R ratio */}
        <div className="flex items-center justify-between bg-[#0d1a10] border border-[#1c2e1e] rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#6b7280]" />
            <span className="text-[#9ca3af] text-sm">Risk / Reward</span>
          </div>
          <span className={`text-lg font-bold font-mono ${rrColor}`}>
            1 : {setup.riskReward.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
