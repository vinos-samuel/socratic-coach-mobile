import Anthropic from "@anthropic-ai/sdk";
import { DeepAnalysisRequest } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function getDeepAnalysis(req: DeepAnalysisRequest): Promise<string> {
  const signalsSummary = req.signals
    .map((s) => `${s.label}: ${s.value} [${s.status.toUpperCase()}]`)
    .join("\n");

  const prompt = `Ticker: ${req.ticker} (${req.name})
Price: $${req.price} | Change: ${req.changePct > 0 ? "+" : ""}${req.changePct.toFixed(2)}%
Momentum Score: ${req.score}/100
Type: ${req.type === "crypto" ? "Cryptocurrency" : "US Stock"}

SIGNALS:
${signalsSummary}

TRADE SETUP (rule-based):
- Entry zone: $${req.tradeSetup.entryLow} – $${req.tradeSetup.entryHigh}
- Target: $${req.tradeSetup.target} (+${req.tradeSetup.targetPct}%)
- Stop-loss: $${req.tradeSetup.stopLoss} (${req.tradeSetup.stopLossPct}%) below ${req.tradeSetup.stopReason}
- Risk/Reward: ${req.tradeSetup.riskReward}:1`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system:
      "You are a professional momentum trader specializing in 1-2 day short-term trades. Analyze setups concisely with clear, actionable guidance. Focus on price action and key levels. Be direct and specific — traders need clarity, not caveats.",
    messages: [
      {
        role: "user",
        content: `Analyze this momentum trade setup for a 1-2 day hold:\n\n${prompt}\n\nRespond in EXACTLY this format — no markdown, no bullet points, no extra text:\nSETUP: <why this setup is compelling or concerning, 1-2 sentences>\nENTRY: <exact entry trigger with specific price level>\nSTOP: <stop level and one-sentence rationale>\nTARGET: <1-2 day price target with reasoning>\nRISK: <the single biggest risk to monitor>`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "Analysis unavailable.";
}
