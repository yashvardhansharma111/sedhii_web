import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grow Capital — Markets, derivatives & commodities",
  description:
    "Grow Capital — trade indices, equities, derivatives and commodities on web and Android. Orders are executed in a simulated environment.",
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
