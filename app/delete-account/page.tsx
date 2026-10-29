"use client";

import { useState } from "react";
import Link from "next/link";

const SUPPORT_EMAIL = "support@growcapitalco.com";
const CONFIRM_WORD = "DELETE";

const REMOVED = [
  "Profile, Client ID and login credentials",
  "Identity details you added (PAN, Aadhaar, bank account, IFSC)",
  "Uploaded images (signature, profile photo, payment-proof screenshots)",
  "Orders, positions, balances, watchlists and fund requests",
];

export default function DeleteAccountPage() {
  const [clientId, setClientId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const canSubmit =
    clientId.trim().length > 0 &&
    password.length > 0 &&
    confirm.trim().toUpperCase() === CONFIRM_WORD &&
    !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (
      !window.confirm(
        "Delete your Grow Capital account permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId: clientId.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message || "Could not delete the account. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-800">
      <div className="mx-auto max-w-3xl px-5 py-12 md:px-6 md:py-16">
        <Link href="/" className="text-sm font-medium text-red-600 hover:underline">
          ← Grow Capital
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Delete your account
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Developer: Grow Capital · App: Grow Capital (com.growcapitalco.app)
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Before you delete.</span> Withdraw any remaining
          balance and allow pending fund requests to complete. Deletion is permanent and cannot be undone.
        </div>

        {done ? (
          <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-lg font-semibold text-emerald-800">Account deleted</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
              Your account and all associated data have been permanently removed. Any devices that
              were signed in are now logged out. Thank you for trying Grow Capital.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-red-600 hover:underline">
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-slate-900">Option 1 — Delete here</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                Enter the Client ID and password you use to sign in. Deletion is immediate and cannot
                be undone.
              </p>

              <form onSubmit={onSubmit} className="mt-5 space-y-4 rounded-2xl border border-slate-200 p-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Client ID
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[15px] outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    autoComplete="username"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                  <input
                    type="password"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[15px] outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Type <span className="text-red-600">{CONFIRM_WORD}</span> to confirm
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[15px] font-semibold tracking-widest outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={CONFIRM_WORD}
                    disabled={busy}
                  />
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Deleting…" : "Permanently delete my account"}
                </button>
              </form>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-semibold text-slate-900">Option 2 — Delete from the app</h2>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
                <li>Open Grow Capital and sign in.</li>
                <li>Go to the <strong>Profile</strong> tab.</li>
                <li>Tap <strong>Delete Account</strong> at the bottom of the screen.</li>
                <li>Enter your password, type <strong>{CONFIRM_WORD}</strong>, and confirm.</li>
              </ol>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-semibold text-slate-900">Option 3 — Email us</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                If you no longer remember your credentials, email{" "}
                <a
                  className="text-red-600 hover:underline"
                  href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion%20request&body=Please%20delete%20my%20Grow%20Capital%20account.%0AClient%20ID%3A%20%0ARegistered%20phone%3A%20`}
                >
                  {SUPPORT_EMAIL}
                </a>{" "}
                from your registered email address with your Client ID and phone number. We confirm by
                reply and complete the deletion within 30 days.
              </p>
            </section>
          </>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">What is deleted</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
            {REMOVED.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            Minimal server security logs (IP address, timestamps) may be kept for up to 90 days, then
            purged. Account access is revoked immediately; all personal data is deleted from our systems
            within 30 days. See the{" "}
            <Link href="/privacy" className="text-red-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <footer className="mt-14 border-t border-slate-100 pt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Grow Capital. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
