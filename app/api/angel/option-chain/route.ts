import { NextRequest, NextResponse } from "next/server";
import { angelPost } from "@/lib/angelone/session";
import {
  getOptionChainInstruments,
  getExpiries,
  INDEX_TOKENS,
} from "@/lib/angelone/instruments";

/**
 * GET /api/angel/option-chain?symbol=NIFTY&expiry=25APR2026
 * GET /api/angel/option-chain?symbol=NIFTY  (returns nearest expiry)
 *
 * Returns CE/PE option chain with live LTP for each strike.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const symbol = (sp.get("symbol") || "NIFTY").toUpperCase();
    let expiry = sp.get("expiry") || "";
    const exchange = sp.get("exchange") || "NFO";

    // Load expiries once — reused at the bottom for the dropdown
    let allExpiries = await getExpiries(symbol, exchange);
    if (!allExpiries.length) {
      return NextResponse.json(
        { error: `No options found for ${symbol}` },
        { status: 404 },
      );
    }
    if (!expiry) expiry = allExpiries[0]; // nearest expiry

    // Get all CE/PE instruments for this expiry
    const { calls: allCalls, puts: allPuts } = await getOptionChainInstruments(
      symbol,
      expiry,
      exchange,
    );

    if (!allCalls.length && !allPuts.length) {
      return NextResponse.json(
        { error: `No options for ${symbol} expiry ${expiry}` },
        { status: 404 },
      );
    }

    // Fetch spot price first (needed to pick ATM strikes); failures are non-fatal
    let spotPrice = 0;
    try {
      const idxInfo = INDEX_TOKENS[symbol];
      if (idxInfo) {
        const spotResult = await angelPost(
          "/rest/secure/angelbroking/market/v1/quote/",
          { mode: "LTP", exchangeTokens: { [idxInfo.exchange]: [idxInfo.token] } },
        );
        if (spotResult.status && spotResult.data?.fetched?.[0]) {
          spotPrice = Number(spotResult.data.fetched[0].ltp);
        }
      } else {
        const { findBySymbol } = await import("@/lib/angelone/instruments");
        const underlyingExchange = exchange === "NFO" ? "NSE" : exchange === "BFO" ? "BSE" : "MCX";
        const inst =
          (await findBySymbol(underlyingExchange, symbol)) ||
          (await findBySymbol(underlyingExchange, `${symbol}-EQ`));
        if (inst) {
          const spotResult = await angelPost(
            "/rest/secure/angelbroking/market/v1/quote/",
            { mode: "LTP", exchangeTokens: { [underlyingExchange]: [inst.token] } },
          );
          if (spotResult.status && spotResult.data?.fetched?.[0]) {
            spotPrice = Number(spotResult.data.fetched[0].ltp);
          }
        }
      }
    } catch (spotErr) {
      console.warn("[angel/option-chain] spot price fetch failed:", spotErr);
    }

    // Limit to strikes near ATM — huge perf win (200+ strikes → ~40)
    // Use all unique strikes, sorted, pick ~20 on each side of spot
    const STRIKE_WINDOW = Number(sp.get("strikes")) || 20;
    const allStrikes = [...new Set([...allCalls.map((c) => c.strike), ...allPuts.map((p) => p.strike)])].sort(
      (a, b) => a - b,
    );
    // Use median strike as fallback ATM when spot fetch failed — prevents
    // including all 200+ strikes which causes rate-limit failures on batch quotes
    const effectiveSpot = spotPrice > 0 ? spotPrice : allStrikes[Math.floor(allStrikes.length / 2)];
    let strikeFilter: Set<number>;
    if (allStrikes.length > STRIKE_WINDOW * 2) {
      const atmIdx = allStrikes.reduce(
        (best, _, idx) =>
          Math.abs(allStrikes[idx] - effectiveSpot) < Math.abs(allStrikes[best] - effectiveSpot) ? idx : best,
        0,
      );
      const start = Math.max(0, atmIdx - STRIKE_WINDOW);
      const end = Math.min(allStrikes.length, atmIdx + STRIKE_WINDOW + 1);
      strikeFilter = new Set(allStrikes.slice(start, end));
    } else {
      strikeFilter = new Set(allStrikes);
    }

    const calls = allCalls.filter((c) => strikeFilter.has(c.strike));
    const puts = allPuts.filter((p) => strikeFilter.has(p.strike));

    // Collect all option tokens for batch quote — interleave CE/PE so each
    // batch has a mix; avoids a rate-limit failure wiping out only CE or only PE
    const nfoTokens: string[] = [];
    const tokenToInstrument = new Map<string, any>();

    const maxLen = Math.max(calls.length, puts.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < calls.length) {
        nfoTokens.push(calls[i].token);
        tokenToInstrument.set(calls[i].token, { ...calls[i], optionType: "CE" });
      }
      if (i < puts.length) {
        nfoTokens.push(puts[i].token);
        tokenToInstrument.set(puts[i].token, { ...puts[i], optionType: "PE" });
      }
    }

    // Batch quote (max 50 per request for Angel)
    const quoteMap = new Map<string, any>();
    const BATCH = 50;
    for (let i = 0; i < nfoTokens.length; i += BATCH) {
      const batch = nfoTokens.slice(i, i + BATCH);
      try {
        const qResult = await angelPost(
          "/rest/secure/angelbroking/market/v1/quote/",
          { mode: "FULL", exchangeTokens: { [exchange]: batch } },
        );
        if (qResult.status && qResult.data?.fetched) {
          for (const q of qResult.data.fetched) {
            quoteMap.set(q.symbolToken || q.symboltoken, q);
          }
        } else {
          console.warn("[angel/option-chain] batch quote non-ok:", qResult?.message);
        }
      } catch (batchErr) {
        console.warn("[angel/option-chain] batch quote failed, continuing:", batchErr);
      }
    }

    // Build strike-indexed chain
    const strikeMap = new Map<number, Record<string, any>>();

    for (const [tok, inst] of tokenToInstrument.entries()) {
      const quote = quoteMap.get(tok);
      const row: Record<string, any> = strikeMap.get(inst.strike) || {
        strike: inst.strike,
      };

      const entry = {
        symbol: inst.symbol,
        token: inst.token,
        ltp: quote?.ltp ?? 0,
        change: quote?.netChange ?? 0,
        changePct: quote?.percentChange ?? 0,
        oi: quote?.opnInterest ?? 0,
        oiChange: quote?.oiChange ?? 0,
        volume: quote?.tradeVolume ?? 0,
        bidPrice: quote?.bestBidPrice ?? 0,
        askPrice: quote?.bestAskPrice ?? 0,
        iv: 0,
        lotSize: inst.lotsize,
      };

      if (inst.optionType === "CE") row.CE = entry;
      else row.PE = entry;

      strikeMap.set(inst.strike, row);
    }

    // Sort by strike
    const chain = [...strikeMap.values()].sort(
      (a, b) => a.strike - b.strike,
    );

    // Find ATM strike
    let atmStrike = 0;
    if (spotPrice > 0 && chain.length) {
      atmStrike = chain.reduce((prev, curr) =>
        Math.abs(curr.strike - spotPrice) < Math.abs(prev.strike - spotPrice)
          ? curr
          : prev,
      ).strike;
    }

    return NextResponse.json({
      symbol,
      expiry,
      exchange,
      spotPrice,
      atmStrike,
      expiries: allExpiries,
      chain,
    });
  } catch (err: any) {
    console.error("[angel/option-chain]", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 },
    );
  }
}
