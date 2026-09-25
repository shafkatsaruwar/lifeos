import { ReticleDev } from './reticle-dev';
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PrivacyTelemetryBoot } from "@/app/components/PrivacyTelemetry";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
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
      <body className={inter.className}>{process.env.NODE_ENV === 'development' ? <ReticleDev /> : null}
        <PrivacyTelemetryBoot />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
