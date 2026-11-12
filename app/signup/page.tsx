"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiUploadCloud } from "react-icons/fi";
import { BrandMark } from "@/components/site/BrandMark";

const DOCUMENT_OPTIONS = [
  "Bank Statement (6Month)",
  "DP holdings",
  "Salary Slip",
  "ITR Acknowledgement",
  "Form 16",
  "Other",
];

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  panNumber: string;
  aadhaarNumber: string;
  accountNo: string;
  ifscCode: string;
  documentType: string;
};

const INITIAL: FormState = {
  fullName: "",
  email: "",
  phone: "",
  panNumber: "",
  aadhaarNumber: "",
  accountNo: "",
  ifscCode: "",
  documentType: DOCUMENT_OPTIONS[0],
};

export default function SignupPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [signature, setSignature] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Enter your full name, email, and phone number");
      return;
    }
    if (!form.accountNo.trim() || !form.ifscCode.trim()) {
      setError("Enter your bank account number and IFSC code");
      return;
    }

    setBusy(true);
    try {
      const payload = new FormData();
      for (const [k, v] of Object.entries(form)) {
        payload.append(k, v);
      }

      // Upload signature only if the user chose one (optional).
      if (signature) {
        const sigForm = new FormData();
        sigForm.append("file", signature);
        const sigRes = await fetch("/api/register/signature-upload", {
          method: "POST",
          body: sigForm,
        });
        const sigData = await sigRes.json();
        if (!sigRes.ok || !sigData?.url) {
          throw new Error(sigData?.message || "Signature upload failed");
        }
        payload.append("signatureUrl", sigData.url);
      }

      if (document) {
        payload.append("document", document);
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Registration failed");
      }
      setSuccess(
        "Registration submitted. Admin will review and email your Client ID and password after approval.",
      );
      setForm(INITIAL);
      setSignature(null);
      setDocument(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--ax-card)" }}
    >
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Brand */}
        <div className="mb-8">
          <BrandMark size="md" />
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--ax-text-secondary)" }}
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <div
          className="mt-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
          style={{ borderColor: "var(--ax-border)" }}
        >
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--ax-text-primary)" }}
          >
            Request account
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            Enter your details below. Signature and supporting documents are
            optional. After admin approval, your Client ID and password will be
            sent to your email.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field
              label="Full Name"
              value={form.fullName}
              onChange={(v) => update("fullName", v)}
              disabled={busy}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              disabled={busy}
            />
            <Field
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(v) => update("phone", v)}
              disabled={busy}
              inputMode="numeric"
            />
            <Field
              label="PAN Number"
              value={form.panNumber}
              onChange={(v) => update("panNumber", v.toUpperCase())}
              disabled={busy}
            />
            <Field
              label="Aadhaar Number"
              value={form.aadhaarNumber}
              onChange={(v) => update("aadhaarNumber", v)}
              disabled={busy}
              inputMode="numeric"
            />
            <Field
              label="Bank Account Number"
              value={form.accountNo}
              onChange={(v) => update("accountNo", v)}
              disabled={busy}
              inputMode="numeric"
            />
            <Field
              label="IFSC Code"
              value={form.ifscCode}
              onChange={(v) => update("ifscCode", v.toUpperCase())}
              disabled={busy}
            />

            <div>
              <p
                className="mt-2 text-xs font-medium"
                style={{ color: "var(--ax-text-secondary)" }}
              >
                Document type
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DOCUMENT_OPTIONS.map((opt) => {
                  const active = form.documentType === opt;
                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => update("documentType", opt)}
                      className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                      style={
                        active
                          ? {
                              backgroundColor: "var(--ax-primary-muted)",
                              borderColor: "var(--ax-primary)",
                              color: "var(--ax-primary)",
                            }
                          : {
                              backgroundColor: "#fff",
                              borderColor: "var(--ax-border)",
                              color: "var(--ax-text-secondary)",
                            }
                      }
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <UploadField
              label="Signature"
              helper="Optional Â· image only"
              accept="image/*"
              file={signature}
              onFile={setSignature}
              preview
              disabled={busy}
            />

            <UploadField
              label="Supporting document"
              helper="Image or PDF"
              accept="image/*,application/pdf"
              file={document}
              onFile={setDocument}
              disabled={busy}
            />

            {error ? (
              <p
                className="rounded-lg px-4 py-2 text-sm"
                style={{
                  backgroundColor: "rgba(229,84,97,0.08)",
                  color: "var(--ax-negative)",
                }}
              >
                {error}
              </p>
            ) : null}
            {success ? (
              <p
                className="rounded-lg px-4 py-2 text-sm"
                style={{
                  backgroundColor: "rgba(220,38,38,0.08)",
                  color: "var(--ax-positive)",
                }}
              >
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "var(--ax-primary)" }}
            >
              {busy ? "Submitting…" : "Submit request"}
            </button>

            <Link
              href="/"
              className="block text-center text-sm font-medium"
              style={{ color: "var(--ax-primary)" }}
            >
              Back to sign in
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div>
      <p
        className="mb-1 text-xs font-medium"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        {label}
      </p>
      <input
        type={type}
        value={value}
        inputMode={inputMode}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[var(--ax-primary)] focus:ring-4"
        style={{
          borderColor: "var(--ax-border)",
          backgroundColor: "var(--ax-card-muted)",
          color: "var(--ax-text-primary)",
        }}
      />
    </div>
  );
}

function UploadField({
  label,
  helper,
  accept,
  file,
  onFile,
  preview = false,
  disabled,
}: {
  label: string;
  helper?: string;
  accept?: string;
  file: File | null;
  onFile: (f: File | null) => void;
  preview?: boolean;
  disabled?: boolean;
}) {
  const previewUrl =
    preview && file && file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: "var(--ax-border)",
        backgroundColor: "var(--ax-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-medium"
          style={{ color: "var(--ax-text-secondary)" }}
        >
          {label}
        </p>
        {helper ? (
          <p
            className="text-[11px]"
            style={{ color: "var(--ax-text-secondary)" }}
          >
            {helper}
          </p>
        ) : null}
      </div>

      {previewUrl ? (
        // Browser-managed object URL; next/image isn't useful for blob: URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={`${label} preview`}
          className="mt-3 h-24 w-24 rounded-xl object-contain"
          style={{ backgroundColor: "var(--ax-card-muted)" }}
        />
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-slate-50"
          style={{
            borderColor: "var(--ax-primary)",
            color: "var(--ax-primary)",
          }}
        >
          <FiUploadCloud className="h-4 w-4" />
          {file ? "Change file" : `Add ${label}`}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled}
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>
        {file ? (
          <button
            type="button"
            onClick={() => onFile(null)}
            disabled={disabled}
            className="text-xs font-medium"
            style={{ color: "var(--ax-negative)" }}
          >
            Remove
          </button>
        ) : null}
      </div>

      <p
        className="mt-3 text-xs"
        style={{ color: "var(--ax-text-secondary)" }}
      >
        {file ? file.name : "No file selected"}
      </p>
    </div>
  );
}
