import NodeCache from "node-cache";

/**
 * In-memory OTP cache (per server instance). Entries expire after TTL.
 * Keyed as `${target}:${value}` — e.g. "phone:+919876543210" or "email:x@y.com".
 */

const OTP_TTL_SECONDS = 5 * 60; // 5 minutes

/**
 * Master test codes. Grow Capital is a paper-trading simulator; reviewers and
 * testers can verify any phone/email with "0000" (or "000000") without an SMS
 * or email actually arriving. Set OTP_MASTER_CODES="" in the environment to disable.
 */
export const OTP_MASTER_CODES: string[] = (process.env.OTP_MASTER_CODES ?? "0000,000000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isMasterOtp(otp: string): boolean {
  return OTP_MASTER_CODES.includes(otp.trim());
}
const VERIFIED_TTL_SECONDS = 30 * 60; // how long a verified mark is usable for signup
const MAX_ATTEMPTS = 5;

export type OtpTarget = "phone" | "email";

export type OtpEntry = {
  otp: string;
  attempts: number;
  verified: boolean;
  createdAt: number;
};

// Survive Next.js hot-reloads in dev — same pattern as the Angel One session cache.
declare global {
  // eslint-disable-next-line no-var
  var __otpCache: NodeCache | undefined;
}

const cache: NodeCache =
  globalThis.__otpCache ??
  (globalThis.__otpCache = new NodeCache({
    stdTTL: OTP_TTL_SECONDS,
    checkperiod: 60,
    useClones: false,
  }));

function key(target: OtpTarget, value: string) {
  return `${target}:${value.trim().toLowerCase()}`;
}

export function generateOtp(): string {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  console.log(`[otp-store] generateOtp → ${otp}`);
  return otp;
}

export function storeOtp(target: OtpTarget, value: string, otp: string): void {
  const entry: OtpEntry = {
    otp,
    attempts: 0,
    verified: false,
    createdAt: Date.now(),
  };
  cache.set(key(target, value), entry, OTP_TTL_SECONDS);
  console.log(`[otp-store] storeOtp  target=${target} value=${value} ttl=${OTP_TTL_SECONDS}s cacheKeys=${cache.keys().length}`);
}

export function verifyOtp(
  target: OtpTarget,
  value: string,
  otp: string,
): { ok: boolean; message: string } {
  const k = key(target, value);

  if (isMasterOtp(otp)) {
    const entry: OtpEntry = { otp: otp.trim(), attempts: 0, verified: true, createdAt: Date.now() };
    cache.set(k, entry, VERIFIED_TTL_SECONDS);
    console.log(`[otp-store] verifyOtp OK — master test code used for ${target}=${value}`);
    return { ok: true, message: "Verified" };
  }

  const entry = cache.get<OtpEntry>(k);
  console.log(`[otp-store] verifyOtp target=${target} value=${value} entryFound=${!!entry} attempts=${entry?.attempts ?? "—"}`);

  if (!entry) {
    console.log(`[otp-store] verifyOtp FAIL — no entry (expired or not requested)`);
    return { ok: false, message: "OTP expired or not requested. Please request a new code." };
  }
  if (entry.verified) {
    console.log(`[otp-store] verifyOtp OK — already verified`);
    return { ok: true, message: "Already verified" };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    cache.del(k);
    console.log(`[otp-store] verifyOtp FAIL — max attempts reached, entry deleted`);
    return { ok: false, message: "Too many wrong attempts. Request a new code." };
  }
  if (entry.otp !== otp.trim()) {
    entry.attempts += 1;
    cache.set(k, entry, OTP_TTL_SECONDS);
    console.log(`[otp-store] verifyOtp FAIL — wrong OTP attempts=${entry.attempts}/${MAX_ATTEMPTS}`);
    return { ok: false, message: "Invalid OTP. Please try again." };
  }
  entry.verified = true;
  cache.set(k, entry, VERIFIED_TTL_SECONDS);
  console.log(`[otp-store] verifyOtp OK — marked verified ttl=${VERIFIED_TTL_SECONDS}s`);
  return { ok: true, message: "Verified" };
}

export function isVerified(target: OtpTarget, value: string): boolean {
  const entry = cache.get<OtpEntry>(key(target, value));
  const result = !!entry?.verified;
  console.log(`[otp-store] isVerified target=${target} value=${value} → ${result} (entryFound=${!!entry})`);
  return result;
}

export function clearVerification(target: OtpTarget, value: string): void {
  cache.del(key(target, value));
  console.log(`[otp-store] clearVerification target=${target} value=${value} remainingKeys=${cache.keys().length}`);
}

/** Persist verified status to MongoDB so it survives serverless cross-instance requests. */
export async function persistVerifiedToDb(target: OtpTarget, value: string): Promise<void> {
  try {
    const { getDb } = await import("./mongodb");
    const db = await getDb();
    await db.collection("otp_verified").updateOne(
      { target, value: value.trim().toLowerCase() },
      { $set: { verified: true, verifiedAt: new Date() } },
      { upsert: true },
    );
  } catch (err) {
    console.error("[otp-store] persistVerifiedToDb failed (non-fatal):", err);
  }
}

/** Check MongoDB as fallback when in-memory cache misses (cross-instance on serverless). */
export async function isVerifiedWithFallback(target: OtpTarget, value: string): Promise<boolean> {
  if (isVerified(target, value)) return true;
  try {
    const { getDb } = await import("./mongodb");
    const db = await getDb();
    const doc = await db.collection("otp_verified").findOne({
      target,
      value: value.trim().toLowerCase(),
      verified: true,
    });
    if (doc) {
      const ageMs = Date.now() - new Date(doc.verifiedAt).getTime();
      const valid = ageMs < VERIFIED_TTL_SECONDS * 1000;
      console.log(`[otp-store] isVerifiedWithFallback DB hit target=${target} value=${value} valid=${valid} ageMs=${ageMs}`);
      return valid;
    }
  } catch (err) {
    console.error("[otp-store] isVerifiedWithFallback DB check failed (non-fatal):", err);
  }
  return false;
}

/** Remove verified status from MongoDB (call after registration completes). */
export async function clearVerifiedFromDb(target: OtpTarget, value: string): Promise<void> {
  try {
    const { getDb } = await import("./mongodb");
    const db = await getDb();
    await db.collection("otp_verified").deleteOne({ target, value: value.trim().toLowerCase() });
  } catch (err) {
    console.error("[otp-store] clearVerifiedFromDb failed (non-fatal):", err);
  }
}
