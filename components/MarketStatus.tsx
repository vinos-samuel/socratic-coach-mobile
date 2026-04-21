"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface MarketStatusProps {
  marketOpen: boolean;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function MarketStatus({ marketOpen, lastUpdated, onRefresh, isRefreshing }: MarketStatusProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const last = new Date(lastUpdated).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - last) / 1000));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const elapsedText = elapsed < 60 ? `${elapsed}s ago` : `${Math.floor(elapsed / 60)}m ago`;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d0d14] border-b border-[#1e1e2e] sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${marketOpen ? "bg-green-400 shadow-[0_0_6px_#22c55e]" : "bg-[#6b7280]"}`}
        />
        <span className="text-xs text-[#9ca3af] font-medium">
          {marketOpen ? "Market Open" : "Market Closed"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#6b7280]">Scanned {elapsedText}</span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
