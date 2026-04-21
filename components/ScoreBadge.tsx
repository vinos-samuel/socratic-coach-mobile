interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const color =
    score >= 80 ? "bg-green-500/20 text-green-400 border-green-500/30" :
    score >= 65 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
    "bg-red-500/20 text-red-400 border-red-500/30";

  const sizeClass =
    size === "sm" ? "text-xs px-2 py-0.5" :
    size === "lg" ? "text-lg px-4 py-1.5 font-bold" :
    "text-sm px-3 py-1";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${color} ${sizeClass}`}>
      <span className="font-mono">{score}</span>
      <span className="opacity-70 font-normal text-xs">/100</span>
    </span>
  );
}
