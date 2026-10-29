import { NextResponse } from "next/server";

/**
 * GET /api/config/app-url
 *
 * Bootstrap endpoint polled by the mobile app on launch. Lets the API host be
 * moved without shipping a new APK: set `APP_PUBLIC_API_URL` on the server and
 * every installed app follows it on next open. Defaults to this request's origin.
 */
export async function GET(request: Request) {
  const fromEnv = (process.env.APP_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  const origin = new URL(request.url).origin;
  const apiUrl = fromEnv || origin;

  return NextResponse.json(
    { apiUrl },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
