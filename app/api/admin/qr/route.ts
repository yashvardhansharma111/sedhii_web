import { apiErrorResponse } from "@/lib/api-error";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

type FundPaymentMeta = {
  upiId?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
};

/**
 * The QR fallback URL is meant to be an external image. Our own image endpoint
 * is not a valid value for it — stored there it becomes a self-referential
 * pointer that survives the image being deleted and then serves a 404 to the
 * funds page as a broken image. Treat any such value as "not set".
 */
function externalQrUrl(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return null;
  if (v.startsWith("/api/") || v.includes("/api/config/fund-qr-image")) return null;
  return v;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("ajx_admin");
    if (!adminCookie || adminCookie.value !== "ok") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const db = await getDb();
    const settings = db.collection("settings");

    const imgDoc = await settings.findOne<{ value?: { data?: unknown } }>({
      key: "fund_qr_image",
    });

    const doc = await settings.findOne<{ value?: string }>({
      key: "fund_qr_url",
    });

    const metaDoc = await settings.findOne<{ value?: FundPaymentMeta }>({
      key: "fund_payment_meta",
    });

    // `qrUrl` is only ever the operator-entered external fallback URL. It must
    // NOT echo back our own image endpoint: the settings form loads this value
    // straight into its "QR URL (fallback)" input, so returning an internal
    // path means the next save persists it, and deleting the image then leaves
    // fund_qr_url dangling at an endpoint that 404s. Image presence travels
    // separately, as a flag.
    return NextResponse.json({
      qrUrl: externalQrUrl(doc?.value),
      hasImage: !!imgDoc?.value?.data,
      paymentMeta: metaDoc?.value || null,
    });
  } catch (error) {
    return apiErrorResponse(error, "Admin QR get error:", "Failed to fetch QR");
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("ajx_admin");
    if (!adminCookie || adminCookie.value !== "ok") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      qrUrl?: string | null;
      paymentMeta?: FundPaymentMeta | null;
    };
    const { qrUrl, paymentMeta } = body || {};

    const db = await getDb();
    const settings = db.collection("settings");

    await settings.updateOne(
      { key: "fund_qr_url" },
      { $set: { value: externalQrUrl(qrUrl), updatedAt: new Date() } },
      { upsert: true },
    );

    await settings.updateOne(
      { key: "fund_payment_meta" },
      {
        $set: {
          value: {
            upiId: paymentMeta?.upiId || null,
            bankName: paymentMeta?.bankName || null,
            accountHolder: paymentMeta?.accountHolder || null,
            accountNumber: paymentMeta?.accountNumber || null,
            ifsc: paymentMeta?.ifsc || null,
          },
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ message: "QR updated" });
  } catch (error) {
    return apiErrorResponse(error, "Admin QR save error:", "Failed to save QR");
  }
}
