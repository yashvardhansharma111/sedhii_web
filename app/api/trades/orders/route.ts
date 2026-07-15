import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getTradeHistory } from "@/lib/trades";
import { getEffectiveOrdersConfigForUser } from "@/lib/effective-orders-config";

/**
 * GET /api/trades/orders — user's trade history.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const limit = Number(request.nextUrl.searchParams.get("limit")) || 50;
    const [trades, effectiveConfig] = await Promise.all([
      getTradeHistory(user._id.toString(), limit),
      getEffectiveOrdersConfigForUser(user._id.toString()),
    ]);

    // Build avgPrice/ltp map for admin rows (trade ids are "admin:<rowId>")
    const adminRows = Array.isArray(effectiveConfig.orders) ? effectiveConfig.orders : [];
    const adminPriceMap = new Map<string, { avgPrice: number; ltp: number }>();
    for (const row of adminRows) {
      const avgPrice = Number(row.buyPrice) || Number(row.avgPrice) || Number(row.orderPrice) || 0;
      const ltp = Number(row.ltp) || Number(row.sellPrice) || avgPrice;
      adminPriceMap.set(row.id, { avgPrice, ltp });
    }

    return NextResponse.json({
      orders: trades.map((t) => {
        const adminId = typeof t.id === "string" && t.id.startsWith("admin:") ? t.id.slice(6) : null;
        const adminPrices = adminId ? adminPriceMap.get(adminId) : null;
        return {
          id: t.id,
          symbol: t.symbol,
          exchange: t.exchange,
          side: t.side,
          qty: t.qty,
          price: t.price,
          avgPrice: adminPrices?.avgPrice ?? (t as any).avgPrice ?? t.price,
          ltp: adminPrices?.ltp ?? t.price,
          orderType: t.orderType,
          status: t.status,
          productType: t.productType,
          totalValue: t.totalValue,
          pnl: t.pnl,
          optionType: t.optionType,
          strikePrice: t.strikePrice,
          expiry: t.expiry,
          createdAt: t.createdAt,
          executedAt: t.executedAt,
        };
      }),
    });
  } catch (err: any) {
    console.error("[trades/orders]", err);
    return NextResponse.json(
      { message: err.message || "Failed to load orders" },
      { status: 500 },
    );
  }
}
