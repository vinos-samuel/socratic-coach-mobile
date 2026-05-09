import { Newspaper, ExternalLink } from "lucide-react";

interface NewsArticle {
  headline: string;
  datetime: number;
  source: string;
  url?: string;
}

interface NewsSectionProps {
  articles: NewsArticle[];
}

export function NewsSection({ articles }: NewsSectionProps) {
  if (articles.length === 0) return null;

  return (
    <div className="bg-[#111a14] border border-[#1c2e1e] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
          Recent News
        </h3>
        <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">
          {articles.length}
        </span>
      </div>
      <div className="space-y-3">
        {articles.map((a, i) => {
          const date = new Date(a.datetime * 1000);
          const timeStr = date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          const inner = (
            <div className="border-b border-[#1c2e1e] last:border-0 pb-3 last:pb-0">
              <p className="text-[#d1d5db] text-sm leading-snug hover:text-emerald-300 transition-colors">
                {a.headline}
                {a.url && <ExternalLink className="w-3 h-3 inline ml-1 text-[#6b7280]" />}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#6b7280] text-xs">{a.source}</span>
                <span className="text-[#4b5563] text-xs">{timeStr}</span>
              </div>
            </div>
          );
          return a.url ? (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
              {inner}
            </a>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
