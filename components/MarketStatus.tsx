"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Lock } from "lucide-react";

interface MarketStatusProps {
  marketOpen: boolean;
  lastUpdated: string;
  scanLockedUntil: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function MarketStatus({ marketOpen, lastUpdated, scanLockedUntil, onRefresh, isRefreshing }: MarketStatusProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const lockedUntil = new Date(scanLockedUntil).getTime();
  const secsRemaining = Math.max(0, Math.round((lockedUntil - Date.now()) / 1000));
  const isLocked = secsRemaining > 0;

  const lockLabel = isLocked
    ? secsRemaining >= 60
      ? `Picks locked ${Math.ceil(secsRemaining / 60)}m`
      : `Picks locked ${secsRemaining}s`
    : "Picks ready to refresh";

  const scannedAt = new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1210] border-b border-[#1c2e1e] sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${marketOpen ? "bg-green-400 shadow-[0_0_6px_#22c55e]" : "bg-[#6b7280]"}`} />
          <span className="text-xs text-[#9ca3af] font-medium">
            {marketOpen ? "Market Open" : "Market Closed"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#6b7280]">
          <Lock className="w-3 h-3" />
          <span>{lockLabel}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#6b7280]">Scanned {scannedAt}</span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing || isLocked}
          title={isLocked ? `Picks refresh in ${Math.ceil(secsRemaining / 60)}m` : "Run new scan"}
          className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
