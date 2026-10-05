import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grow Capital — Paper trading simulator",
  description:
    "Grow Capital — practise trading India's markets with virtual funds. Paper trading only; no real money is involved.",
  icons: {
    icon: [{ url: "/icon.jpg" }, { url: "/icon.jpeg" }],
    shortcut: "/icon.jpg",
    apple: "/icon.jpg",
  },
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
