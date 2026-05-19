import { NextRequest, NextResponse } from "next/server";
import { getSnapshotBatch } from "@/lib/polygon";
import { getFinnhubQuote } from "@/lib/finnhub";

export const dynamic = "force-dynamic";

function minutesIntoSession(): number {
  const now = new Date();
  const etStr = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [h, m] = etStr.split(":").map(Number);
  const total = h * 60 + m;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  if (total < open) return 0;
  if (total >= close) return 390;
  return total - open;
}

function isMarketOpen(mins: number): boolean {
  const now = new Date();
  const day = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  ).getDay();
  if (day === 0 || day === 6) return false;
  return mins > 0 && mins < 390;
}

export async function POST(req: NextRequest) {
  try {
    const { tickers, avgVolumes } = (await req.json()) as {
      tickers: string[];
      avgVolumes: Record<string, number>;
    };

    if (!tickers?.length) {
      return NextResponse.json({ tickers: {}, minutesInSession: 0, marketOpen: false });
    }

    const snapshot = await getSnapshotBatch(tickers);

    // Finnhub fallback for any tickers the snapshot didn't return
    const missing = tickers.filter((t) => !snapshot.has(t));
    if (missing.length > 0) {
      await Promise.allSettled(
        missing.map(async (ticker) => {
          const q = await getFinnhubQuote(ticker);
          if (q && q.c > 0) {
            snapshot.set(ticker, {
              ticker,
              day: { o: q.o, h: q.h, l: q.l, c: q.c, v: q.v ?? 0, vw: 0 },
              prevDay: { c: q.pc },
              lastTrade: { p: q.c, t: q.t * 1_000_000_000 },
              todaysChange: q.d,
              todaysChangePerc: q.dp,
            });
          }
        })
      );
    }

    const mins = minutesIntoSession();
    const marketOpen = isMarketOpen(mins);

    const result: Record<
      string,
      { price: number; changePct: number; dayVolume: number; normalizedVolRatio: number | null }
    > = {};

    for (const ticker of tickers) {
      const snap = snapshot.get(ticker);
      if (!snap) continue;

      const price = snap.lastTrade?.p || snap.day.c;
      const changePct = snap.todaysChangePerc;
      const dayVolume = snap.day.v;
      const avgVol = avgVolumes[ticker] ?? 0;

      let normalizedVolRatio: number | null = null;
      if (avgVol > 0 && dayVolume > 0) {
        if (mins >= 390) {
          normalizedVolRatio = dayVolume / avgVol;
        } else if (mins > 0) {
          const expectedByNow = avgVol * (mins / 390);
          normalizedVolRatio = expectedByNow > 0 ? dayVolume / expectedByNow : null;
        }
        // Before open: leave null
      }

      result[ticker] = {
        price: +price.toFixed(2),
        changePct: +changePct.toFixed(2),
        dayVolume,
        normalizedVolRatio: normalizedVolRatio !== null ? +normalizedVolRatio.toFixed(2) : null,
      };
    }

    return NextResponse.json({
      tickers: result,
      minutesInSession: mins,
      marketOpen,
      lastUpdated: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
