import Link from "next/link";

/**
 * Sedhii wordmark — a gradient "S" tile plus the name. Pure CSS, so it stays
 * crisp at any size and needs no image asset. Colours come from the --ax-*
 * tokens in globals.css, so the mark follows the brand palette.
 */

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  /** Pass null to render the mark without wrapping it in a link. */
  href?: string | null;
  /** Hide the "Sedhii" text and render the tile alone (tight mobile headers). */
  markOnly?: boolean;
  className?: string;
};

const sizes = {
  sm: { mark: "h-8 w-8 text-sm rounded-lg", text: "text-sm" },
  md: { mark: "h-10 w-10 text-lg rounded-xl", text: "text-lg" },
  lg: { mark: "h-14 w-14 text-2xl rounded-2xl", text: "text-2xl" },
};

export function BrandMark({
  size = "md",
  href = "/",
  markOnly = false,
  className = "",
}: BrandMarkProps) {
  const s = sizes[size];

  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`inline-flex shrink-0 items-center justify-center font-bold text-white ${s.mark}`}
        style={{
          background:
            "linear-gradient(135deg, var(--ax-primary) 0%, var(--ax-primary-deep) 100%)",
          boxShadow: "0 4px 14px rgba(220, 38, 38, 0.28)",
        }}
      >
        S
      </span>
      {!markOnly && (
        <span
          className={`font-semibold tracking-tight ${s.text}`}
          style={{ color: "var(--ax-text-primary)" }}
        >
          Sedhii
        </span>
      )}
    </span>
  );

  if (href == null) return inner;
  return (
    <Link href={href} className="transition hover:opacity-90">
      {inner}
    </Link>
  );
}
