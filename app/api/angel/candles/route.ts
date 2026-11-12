import { NextRequest, NextResponse } from "next/server";
import { angelPost } from "@/lib/angelone/session";
import { INDEX_TOKENS, resolveTradable } from "@/lib/angelone/instruments";
import {
  fetchYahooCandles,
  toYahooSymbol,
  YAHOO_DELAY_MINUTES,
  YAHOO_DELAY_MS,
} from "@/lib/yahoo";

/**
 * GET /api/angel/candles?symbol=RELIANCE&exchange=NSE&interval=ONE_DAY&range=1M
 *
 * Returns OHLCV candle array from Angel One historical API.
 * Supports: ONE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE, THIRTY_MINUTE, ONE_HOUR, ONE_DAY
 *
 * When Angel One fails — login refused ("Access denied"), rate limit, an
 * unresolvable symbol, or an empty result — we fall back to Yahoo Finance for
 * indices and cash equities. MCX and individual option legs have no Yahoo
 * equivalent, so those still surface the Angel error.
 *
 * Yahoo's NSE/BSE feed is DELAYED ~15 min, so the fallback is not equivalent
 * to Angel. Two consequences, both handled below:
 *   1. A cached Angel response younger than that delay is genuinely fresher
 *      than Yahoo, so it wins over falling back.
 *   2. Anything served from Yahoo is labelled `delayed: true` with an `asOf`
 *      timestamp, so the client can badge the chart instead of implying live.
 */

const RANGE_MAP: Record<string, { days: number; interval: string }> = {
  "1D": { days: 1, interval: "FIVE_MINUTE" },
  "3D": { days: 3, interval: "ONE_MINUTE" },
  "5D": { days: 5, interval: "FIVE_MINUTE" },
  "1W": { days: 7, interval: "FIFTEEN_MINUTE" },
  "1M": { days: 30, interval: "ONE_DAY" },
  "3M": { days: 90, interval: "ONE_DAY" },
  "6M": { days: 180, interval: "ONE_DAY" },
  "1Y": { days: 365, interval: "ONE_DAY" },
};

// Cache TTL per range — intraday refreshes faster than daily/weekly
const CACHE_TTL_MS: Record<string, number> = {
  "1D": 30_000,
  "3D": 60_000,
  "5D": 60_000,
  "1W": 120_000,
  "1M": 300_000,
  "3M": 600_000,
  "6M": 1_200_000,
  "1Y": 3_600_000,
};

interface CacheEntry {
  payload: unknown;
  fetchedAt: number;
  /** True when this entry came from Yahoo's delayed feed rather than Angel. */
  delayed?: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __candleCache: Map<string, CacheEntry> | undefined;
}
const candleCache: Map<string, CacheEntry> =
  globalThis.__candleCache ?? (globalThis.__candleCache = new Map());

/**
 * Delayed entries expire fast so a recovered Angel feed takes over within a
 * minute, instead of a Yahoo snapshot holding the cache for the range TTL
 * (up to an hour on 1Y).
 */
const DELAYED_CACHE_TTL = 60_000;

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const symbolName = sp.get("symbol") || "NIFTY";
  const exchange = sp.get("exchange") || "NSE";
  const range = sp.get("range") || "1D";
  const intervalOverride = sp.get("interval");

  const rangeConfig = RANGE_MAP[range] || RANGE_MAP["1D"];
  const interval = intervalOverride || rangeConfig.interval;

  // Keyed on the REQUESTED exchange, not the resolved one, so the cache still
  // answers when symbol resolution is itself what failed, and so both sources
  // share a single entry.
  const cacheKey = `${symbolName.toUpperCase()}:${exchange.toUpperCase()}:${range}:${interval}`;
  const cached = candleCache.get(cacheKey);
  const ttl = cached?.delayed ? DELAYED_CACHE_TTL : CACHE_TTL_MS[range] ?? 60_000;

  if (cached && Date.now() - cached.fetchedAt < ttl) {
    console.log(`[angel/candles] CACHE HIT  ${cacheKey} age=${Math.round((Date.now() - cached.fetchedAt) / 1000)}s`);
    return NextResponse.json(cached.payload);
  }

  /** Last resort before erroring: stale cache beats no chart at all. */
  const serveStale = (why: string) => {
    if (!cached) return null;
    console.log(`[angel/candles] ${why} — serving stale cache ${cacheKey}`);
    return NextResponse.json(cached.payload);
  };

  /**
   * Yahoo Finance fallback — DELAYED data, labelled as such.
   * Returns null when Yahoo can't serve this symbol (MCX, option legs).
   */
  const tryYahoo = async (why: string) => {
    const yahooSymbol = toYahooSymbol(symbolName, exchange);
    if (!yahooSymbol) {
      console.warn(`[angel/candles] ${why} — no Yahoo mapping for ${exchange}:${symbolName}`);
      return null;
    }
    try {
      const { candles, asOf } = await fetchYahooCandles(yahooSymbol, range, intervalOverride);
      // Fewer than two bars is not a chart. Yahoo carries some Indian index
      // tickers (e.g. NIFTY_MIDCAP_100.NS) with only a current quote and no
      // history — treat that as a miss rather than drawing a single point.
      if (candles.length < 2) {
        console.warn(
          `[angel/candles] ${why} — Yahoo gave ${candles.length} candle(s) for ${yahooSymbol}, not usable`,
        );
        return null;
      }
      const ageMin = asOf ? Math.round((Date.now() / 1000 - asOf) / 60) : null;
      console.log(
        `[angel/candles] ${why} — served ${candles.length} DELAYED candles from Yahoo ` +
          `(${yahooSymbol}, newest is ${ageMin ?? "?"} min old)`,
      );
      const payload = {
        symbol: symbolName,
        exchange,
        range,
        interval,
        candles,
        source: "yahoo" as const,
        // Yahoo's NSE/BSE feed lags real time — never render this as live.
        delayed: true,
        delayMinutes: YAHOO_DELAY_MINUTES,
        asOf: asOf ? new Date(asOf * 1000).toISOString() : null,
      };
      candleCache.set(cacheKey, { payload, fetchedAt: Date.now(), delayed: true });
      return NextResponse.json(payload);
    } catch (e) {
      console.error("[angel/candles] Yahoo fallback failed —", (e as Error).message);
      return null;
    }
  };

  /**
   * Choose the best recovery when Angel is unusable. A cached Angel response
   * younger than Yahoo's delay window is more current than anything Yahoo
   * would return, so it wins; otherwise take delayed data over no data.
   */
  const recover = async (why: string) => {
    if (cached && !cached.delayed && Date.now() - cached.fetchedAt < YAHOO_DELAY_MS) {
      return serveStale(`${why} (cache is fresher than Yahoo's ${YAHOO_DELAY_MINUTES}-min feed)`);
    }
    return (await tryYahoo(why)) ?? serveStale(why);
  };

  try {
    // Resolve symbol token (handles indices, equities, options, MCX futures)
    let token: string | undefined;
    let resolvedExchange = exchange;
    const idxEntry = INDEX_TOKENS[symbolName.toUpperCase()];
    if (idxEntry) {
      token = idxEntry.token;
      resolvedExchange = idxEntry.exchange;
    } else {
      const inst = await resolveTradable(exchange, symbolName);
      if (inst) {
        token = inst.token;
        resolvedExchange = inst.exch_seg;
      }
    }

    if (!token) {
      // Scrip master may be down, or the symbol genuinely isn't on Angel.
      console.warn(`[angel/candles] symbol not found: ${exchange}:${symbolName}`);
      return (
        (await recover("symbol unresolved")) ??
        NextResponse.json(
          { error: `Symbol not found: ${exchange}:${symbolName}` },
          { status: 404 },
        )
      );
    }

    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - rangeConfig.days * 24 * 60 * 60 * 1000);

    // For single-day intraday: clamp fromDate to market open so we get today's candles only.
    if (range === "1D") {
      const mcx = resolvedExchange === "MCX";
      fromDate.setHours(mcx ? 9 : 9, mcx ? 0 : 15, 0, 0);
    }

    const body = {
      exchange: resolvedExchange,
      symboltoken: token,
      interval,
      fromdate: formatDate(fromDate),
      todate: formatDate(toDate),
    };

    console.log(`[angel/candles] FETCH ${cacheKey} from=${body.fromdate} to=${body.todate}`);

    const result = await angelPost(
      "/rest/secure/angelbroking/historical/v1/getCandleData",
      body,
    );

    console.log(`[angel/candles] ANGEL response status=${result?.status} msg=${result?.message ?? "—"} dataLen=${Array.isArray(result?.data) ? result.data.length : "none"}`);

    if (!result.status || !result.data) {
      const why = result.message || "no candle data";
      console.warn("[angel/candles] Angel One error —", why);
      return (
        (await recover(`angel error: ${why}`)) ??
        NextResponse.json({ error: why }, { status: 502 })
      );
    }

    const parseCandles = (raw: any[]) =>
      raw.map(([time, open, high, low, close, volume]: any[]) => ({
        time: new Date(time).getTime() / 1000,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
      }));

    let candles = parseCandles(result.data as any[]);

    // BSE indices (e.g. BANKEX) often have no intraday data — fall back to daily candles.
    if (candles.length === 0 && resolvedExchange === "BSE" && interval !== "ONE_DAY") {
      console.log(`[angel/candles] BSE intraday empty for ${symbolName}, retrying with ONE_DAY`);
      const fbFrom = new Date(toDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      const fbBody = {
        exchange: resolvedExchange,
        symboltoken: token,
        interval: "ONE_DAY",
        fromdate: formatDate(fbFrom),
        todate: formatDate(toDate),
      };
      try {
        const fbResult = await angelPost(
          "/rest/secure/angelbroking/historical/v1/getCandleData",
          fbBody,
        );
        if (fbResult?.status && Array.isArray(fbResult.data) && fbResult.data.length > 0) {
          candles = parseCandles(fbResult.data);
          console.log(`[angel/candles] BSE daily fallback: ${candles.length} candles`);
        }
      } catch (fbErr) {
        console.warn(`[angel/candles] BSE daily fallback failed for ${symbolName}`, fbErr);
      }
    }

    // Angel said OK but gave us nothing — a soft failure worth recovering from.
    if (!candles.length) {
      const fallback = await recover("angel returned empty candles");
      if (fallback) return fallback;
    }

    const payload = {
      symbol: symbolName,
      exchange,
      range,
      interval,
      candles,
      source: "angel" as const,
    };
    candleCache.set(cacheKey, { payload, fetchedAt: Date.now() });
    console.log(`[angel/candles] CACHE SET  ${cacheKey} candles=${candles.length} ttl=${ttl / 1000}s`);

    return NextResponse.json(payload);
  } catch (err: any) {
    // Angel login refusals ("Access denied") land here, so this is the path
    // that matters most in practice — never let it reach the chart as an error.
    const msg = err?.message || "Internal error";
    console.error(`[angel/candles] ERROR ${symbolName}:${exchange}:${range}`, msg);
    return (
      (await recover(`threw: ${msg}`)) ??
      NextResponse.json({ error: msg }, { status: 500 })
    );
  }
}
