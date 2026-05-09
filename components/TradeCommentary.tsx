"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, TrendingUp, Crosshair, ShieldAlert, Target, AlertTriangle, Send, MessageCircle } from "lucide-react";
import { MomentumPick, DeepAnalysisRequest, ChatMessage } from "@/types";

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

const STARTER_QUESTIONS = [
  "Is this a good entry right now?",
  "What would make this trade fail?",
  "How should I size this position?",
  "When should I take partial profits?",
];

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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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

  async function sendChatMessage(message?: string) {
    const text = (message ?? chatInput).trim();
    if (!text || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: pick.ticker,
          name: pick.name,
          price: pick.price,
          changePct: pick.changePct,
          score: pick.score,
          tradeSetup: pick.tradeSetup,
          messages: nextMessages,
        }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      setChatMessages([...nextMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setChatMessages([...nextMessages, { role: "assistant", content: assistantContent }]);
      }
    } catch {
      setChatMessages([...nextMessages, { role: "assistant", content: "Sorry, chat unavailable. Check your ANTHROPIC_API_KEY." }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
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
          className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-950 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 px-4 text-sm transition-colors mb-4"
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

      {/* Chat interface — available after deep analysis loads */}
      {deepAnalysis && (
        <div className="border-t border-[#1c2e1e] pt-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Ask a follow-up</span>
          </div>

          {/* Starter question chips */}
          {chatMessages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendChatMessage(q)}
                  disabled={chatLoading}
                  className="text-xs bg-[#0d1a10] border border-[#1c2e1e] hover:border-emerald-500/40 text-[#9ca3af] hover:text-emerald-300 rounded-full px-3 py-1 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Chat messages */}
          {chatMessages.length > 0 && (
            <div className="space-y-3 mb-3 max-h-80 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-700 text-white"
                      : "bg-[#0d1a10] border border-[#1c2e1e] text-[#d1d5db]"
                  }`}>
                    {msg.content || (msg.role === "assistant" && chatLoading && i === chatMessages.length - 1
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : null
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
              placeholder="Ask anything about this trade..."
              className="flex-1 bg-[#0d1a10] border border-[#1c2e1e] focus:border-emerald-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#4b5563] outline-none transition-colors disabled:opacity-50"
            />
            <button
              onClick={() => sendChatMessage()}
              disabled={chatLoading || !chatInput.trim()}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-950 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
            >
              {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
