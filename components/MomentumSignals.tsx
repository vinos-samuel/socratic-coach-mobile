import { MomentumSignal } from "@/types";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface MomentumSignalsProps {
  signals: MomentumSignal[];
}

export function MomentumSignals({ signals }: MomentumSignalsProps) {
  return (
    <div className="bg-[#111a14] border border-[#1c2e1e] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
        Momentum Signals
      </h3>
      <div className="space-y-2">
        {signals.map((sig) => {
          const isPass = sig.status === "pass";
          const isWarn = sig.status === "warn";
          const Icon = isPass ? CheckCircle : isWarn ? AlertTriangle : XCircle;
          const iconColor = isPass ? "text-green-400" : isWarn ? "text-amber-400" : "text-red-400";
          const rowBg = isPass ? "bg-green-500/5" : isWarn ? "bg-amber-500/5" : "bg-red-500/5";
          const borderColor = isPass ? "border-green-500/10" : isWarn ? "border-amber-500/10" : "border-red-500/10";

          return (
            <div
              key={sig.name}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${rowBg} ${borderColor}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white text-sm font-medium">{sig.label}</span>
                  <span className={`text-xs font-mono ${iconColor} truncate text-right max-w-[180px]`}>
                    {sig.value}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
