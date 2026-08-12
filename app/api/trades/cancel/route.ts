import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { cancelPendingOrder } from "@/lib/trades";

/**
 * POST /api/trades/cancel
 * Body: { tradeId: string }
 * Cancels a resting PENDING limit order.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const tradeId = body?.tradeId;
    if (!tradeId || typeof tradeId !== "string") {
      return NextResponse.json(
        { message: "tradeId is required" },
        { status: 400 },
      );
    }

    const { newBalance } = await cancelPendingOrder(
      user._id.toString(),
      tradeId,
    );

    return NextResponse.json({
      message: "Limit order cancelled",
      newBalance,
    });
  } catch (err: any) {
    console.error("[trades/cancel]", err);
    const msg = err.message || "Cancel failed";
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ message: msg }, { status });
  }
}
