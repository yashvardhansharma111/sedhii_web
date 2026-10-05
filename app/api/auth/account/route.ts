import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { apiErrorResponse } from "@/lib/api-error";

type UserDoc = {
  _id: ObjectId;
  clientId?: string;
  passwordHash?: string;
};

/**
 * DELETE /api/auth/account
 *
 * Permanently deletes the caller's account and every record tied to it.
 * Identity is confirmed in one of two ways:
 *   1. Signed in (Bearer token from the mobile app, or the web session cookie)
 *      + `password` in the JSON body.
 *   2. Not signed in (the public /delete-account web page)
 *      + `clientId` and `password` in the JSON body.
 *
 * Grow Capital is a paper-trading simulator, so there is no real balance to
 * settle first — virtual balances, simulated trades and positions are simply erased.
 */
export async function DELETE(request: Request) {
  try {
    let body: { password?: unknown; clientId?: unknown } = {};
    try {
      body = (await request.json()) ?? {};
    } catch {
      body = {};
    }

    const password = typeof body.password === "string" ? body.password : "";
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";

    if (!password) {
      return NextResponse.json(
        { message: "Your current password is required to delete the account" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const users = db.collection<UserDoc>("users");

    // 1. Signed-in caller
    let target: UserDoc | null = null;
    const sessionUser = (await getUserFromRequest(request)) as UserDoc | null;
    if (sessionUser?._id) {
      target = await users.findOne(
        { _id: new ObjectId(sessionUser._id) },
        { projection: { _id: 1, clientId: 1, passwordHash: 1 } },
      );
    }

    // 2. Anonymous caller from the web page — must supply Client ID
    if (!target) {
      if (!clientId) {
        return NextResponse.json(
          { message: "Sign in, or provide your Client ID and password" },
          { status: 401 },
        );
      }
      target = await users.findOne(
        { clientId },
        { projection: { _id: 1, clientId: 1, passwordHash: 1 } },
      );
    }

    // Same message for unknown user and wrong password so the endpoint
    // cannot be used to enumerate Client IDs.
    const invalid = NextResponse.json(
      { message: "Invalid Client ID or password" },
      { status: 401 },
    );
    if (!target?.passwordHash) return invalid;
    const ok = await bcrypt.compare(password, target.passwordHash);
    if (!ok) return invalid;

    const userId = new ObjectId(target._id);

    await Promise.all([
      db.collection("sessions").deleteMany({ userId }),
      db.collection("trades").deleteMany({ userId }),
      db.collection("positions").deleteMany({ userId }),
      db.collection("fund_requests").deleteMany({ userId }),
    ]);
    await users.deleteOne({ _id: userId });

    console.info("[account.delete] user removed", {
      clientId: target.clientId,
      userId: userId.toHexString(),
    });

    const response = NextResponse.json({
      ok: true,
      message: "Your account and all associated data have been permanently deleted.",
    });
    response.cookies.set("ajx_session", "", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (error) {
    return apiErrorResponse(
      error,
      "Account delete error:",
      "Could not delete the account right now. Please try again later.",
    );
  }
}
