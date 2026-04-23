import { NextResponse } from "next/server";
import { getDeepAnalysis } from "@/lib/claude";
import { DeepAnalysisRequest, DeepAnalysisResponse } from "@/types";
import { z } from "zod";

const schema = z.object({
  ticker: z.string().min(1).max(12),
  name: z.string(),
  price: z.number(),
  changePct: z.number(),
  signals: z.array(z.object({
    name: z.string(),
    label: z.string(),
    value: z.string(),
    status: z.enum(["pass", "warn", "fail"]),
  })),
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
  rsRating: z.number(),
  volumeRatio: z.number(),
  rsi: z.number(),
  score: z.number(),
  type: z.enum(["stock", "crypto"]),
});

export async function POST(req: Request) {
  // Block requests not coming from the app's own domain
  const origin = req.headers.get("origin") ?? "";
  const host = req.headers.get("host") ?? "";
  const allowedHosts = process.env.ALLOWED_ORIGIN ?? host;
  if (origin && !origin.includes(allowedHosts) && !origin.includes("localhost")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body) as DeepAnalysisRequest;
    const analysis = await getDeepAnalysis(data);
    const response: DeepAnalysisResponse = { analysis };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
