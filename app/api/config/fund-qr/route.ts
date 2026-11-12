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
 * Only an external image URL is a usable fallback. Older saves could persist
 * our own image endpoint into fund_qr_url (the admin form echoed it back into
 * its input); once the stored image is deleted that pointer dangles and the
 * funds page renders a broken image. Treat any internal path as "not set".
 */
function externalQrUrl(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return null;
  if (v.startsWith("/api/") || v.includes("/api/config/fund-qr-image")) return null;
  return v;
}

export async function GET(request: Request) {
  console.log("\n========== [fund-qr] GET ==========");
  console.log("[fund-qr] headers:", {
    host: request.headers.get("host"),
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  });

  try {
    const db = await getDb();
    const settings = db.collection("settings");

    const imgDoc = await settings.findOne<{ value?: { data?: unknown; version?: string } }>({
      key: "fund_qr_image",
    });
    const metaDoc = await settings.findOne<{ value?: FundPaymentMeta }>({
      key: "fund_payment_meta",
    });

    console.log("[fund-qr] imgDoc found:", !!imgDoc?.value?.data);
    console.log("[fund-qr] metaDoc raw:", JSON.stringify(metaDoc?.value ?? null));

    const meta = metaDoc?.value || null;
    console.log("[fund-qr] paymentMeta being sent:", {
      upiId: meta?.upiId ?? "MISSING",
      accountHolder: meta?.accountHolder ?? "MISSING",
      bankName: meta?.bankName ?? "MISSING",
      accountNumber: meta?.accountNumber ?? "MISSING",
      ifsc: meta?.ifsc ?? "MISSING",
    });

    if (imgDoc?.value?.data) {
      const v = imgDoc.value.version || "1";
      const qrUrl = `/api/config/fund-qr-image?v=${v}`;
      console.log("[fund-qr] response: qrUrl=", qrUrl, "(image stored in DB, version:", v, ")");
      return NextResponse.json({ qrUrl, paymentMeta: meta });
    }

    const doc = await settings.findOne<{ value?: string }>({
      key: "fund_qr_url",
    });

    console.log("[fund-qr] qrUrl from DB:", doc?.value ?? "null (no QR configured)");
    console.log("[fund-qr] response sent ✓");
    console.log("=========================================\n");

    return NextResponse.json({
      qrUrl: externalQrUrl(doc?.value),
      paymentMeta: meta,
    });
  } catch (error) {
    console.error("[fund-qr] ERROR:", error);
    return NextResponse.json(
      { message: "Failed to load config" },
      { status: 500 },
    );
  }
}
