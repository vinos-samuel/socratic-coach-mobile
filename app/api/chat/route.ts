import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const schema = z.object({
  ticker: z.string().min(1).max(12),
  name: z.string(),
  price: z.number(),
  changePct: z.number(),
  score: z.number(),
  tradeSetup: z.object({
    entryLow: z.number(),
    entryHigh: z.number(),
    entryTrigger: z.string(),
    target: z.number(),
    targetPct: z.number(),
    stopLoss: z.number(),
    stopLossPct: z.number(),
    riskReward: z.number(),
    stopReason: z.string(),
  }),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const { ticker, name, price, changePct, score, tradeSetup, messages } = data;

    const systemPrompt = `You are a professional momentum trader and swing trade coach. You are analyzing ${ticker} (${name}) for a 1-5 day swing trade held by a retail trader in Singapore.

Current state:
- Price: $${price} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% today)
- Momentum score: ${score}/100
- Entry zone: $${tradeSetup.entryLow} – $${tradeSetup.entryHigh}
- Target: $${tradeSetup.target} (+${tradeSetup.targetPct}%)
- Stop-loss: $${tradeSetup.stopLoss} (${tradeSetup.stopLossPct}%) — below ${tradeSetup.stopReason}
- Risk/Reward: ${tradeSetup.riskReward}:1

Answer concisely and specifically. Reference exact price levels. Be direct — give actionable guidance, not disclaimers. The trader uses a standard broker (Syfe Trade) and trades between 9:30 PM and 2:30 AM SGT (US market hours).`;

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response("Chat failed — check ANTHROPIC_API_KEY.", { status: 500 });
  }
}
