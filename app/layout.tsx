import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LifeOS — Your life, in focus",
  description: "A calm personal operating system for deciding what matters now.",
  icons: {
    icon: "/favicon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "LifeOS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#111214" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
