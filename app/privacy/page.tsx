import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Sedhii",
  description:
    "How Sedhii collects, uses and deletes your data.",
};

const LAST_UPDATED = "5 October 2026";
const SUPPORT_EMAIL = "support@sedhii.com";
const PRIVACY_EMAIL = "privacy@sedhii.com";

const SECTIONS: { title: string; items?: string[]; text?: string[] }[] = [
  {
    title: "1. Who we are",
    text: [
      'Sedhii ("we", "us", "our") operates the Sedhii mobile application and the website sedhii.com.',
      "Orders placed on Sedhii are executed in a simulated environment and are not routed to any stock exchange. Sedhii is not a SEBI-registered stockbroker, investment adviser or depository participant.",
    ],
  },
  {
    title: "2. Information we collect",
    items: [
      "Account details you provide when requesting an account: full name, email address, phone number, date of birth and a signature image used to verify your request.",
      "Optional identity details you choose to add to your profile (PAN, Aadhaar number, bank account number, IFSC). These are used to verify your account and process fund requests.",
      "Login credentials: your Client ID and a hashed password. Passwords are never stored in plain text.",
      "Platform data: watchlists, orders, positions, balances and fund requests.",
      "Technical data: device model, OS version, app version, crash logs and IP address, used to keep the service reliable and secure.",
      "Photos: only images you explicitly pick or capture (signature, profile photo, payment-proof screenshots). We do not scan your photo library.",
    ],
  },
  {
    title: "3. How we use it",
    items: [
      "To create and secure your account and let you sign in.",
      "To operate the platform: your portfolio, orders, positions and balances.",
      `To respond to support requests sent to ${SUPPORT_EMAIL}.`,
      "To detect abuse, fraud and security incidents, and to comply with applicable law.",
    ],
    text: ["We do not sell your personal information and we do not use it for third-party advertising."],
  },
  {
    title: "4. Market data and third parties",
    text: [
      "Price and chart data comes from third-party market data providers; only the instrument symbols you view are requested, never your personal information.",
      "We use infrastructure providers (hosting, database, file storage, email and SMS delivery) that process data on our behalf under confidentiality obligations. We may disclose information where required by law or a lawful request by a public authority.",
    ],
  },
  {
    title: "5. Data retention",
    text: [
      "Account data is kept while your account is active. When you delete your account, your profile, credentials, identity details, uploaded images, orders and balances are permanently removed within 30 days. Minimal server logs may be retained for up to 90 days for security purposes.",
    ],
  },
  {
    title: "6. Your rights and choices",
    items: [
      "Access & correction: edit your profile from the Profile screen at any time.",
      "Deletion: use Profile → Delete Account in the app, or the Delete Account page on this site.",
      "Portability: download your ledger as CSV from the Orders screen.",
      `Any other request or complaint: ${PRIVACY_EMAIL}. We aim to respond within 30 days.`,
    ],
  },
  {
    title: "7. Security",
    text: [
      "Data is transmitted over HTTPS and passwords are hashed. Access to production systems is restricted to authorised personnel. No method of storage or transmission is completely secure, so please keep your Client ID and password confidential.",
    ],
  },
  {
    title: "8. Children",
    text: [
      `Sedhii is not intended for anyone under 18 and we do not knowingly collect personal information from children. If you believe a minor has provided us data, contact ${PRIVACY_EMAIL} and we will delete it.`,
    ],
  },
  {
    title: "9. Changes to this policy",
    text: [
      "We may update this policy from time to time. The latest version is always available in the app and on this page. Material changes will be announced in the app.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-800">
      <div className="mx-auto max-w-3xl px-5 py-12 md:px-6 md:py-16">
        <Link href="/" className="text-sm font-medium text-red-600 hover:underline">
          ← Sedhii
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">Execution notice.</span> Orders placed on Sedhii are executed in a simulated environment and are not routed to any stock exchange. Sedhii is not a SEBI-registered stockbroker, investment adviser or depository participant.
          </p>
        </div>

        <div className="mt-10 space-y-9">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-slate-900">{s.title}</h2>
              {s.items ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-600">
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              ) : null}
              {s.text?.map((p) => (
                <p key={p} className="mt-3 text-[15px] leading-relaxed text-slate-600">
                  {p}
                </p>
              ))}
            </section>
          ))}

          <section>
            <h2 className="text-lg font-semibold text-slate-900">10. Contact</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
              Sedhii
              <br />
              Privacy:{" "}
              <a className="text-red-600 hover:underline" href={`mailto:${PRIVACY_EMAIL}`}>
                {PRIVACY_EMAIL}
              </a>
              <br />
              Support:{" "}
              <a className="text-red-600 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
              <br />
              Delete your account:{" "}
              <Link className="text-red-600 hover:underline" href="/delete-account">
                sedhii.com/delete-account
              </Link>
            </p>
          </section>
        </div>

        <footer className="mt-14 border-t border-slate-100 pt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Sedhii. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
