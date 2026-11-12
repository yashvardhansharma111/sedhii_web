import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sedhii — Markets, derivatives & commodities",
  description:
    "Sedhii — trade indices, equities, derivatives and commodities on web and Android. Orders are executed in a simulated environment.",
  // Favicon and touch icon come from app/icon.png and app/apple-icon.png,
  // which Next.js picks up automatically — no manual `icons` entry needed.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
