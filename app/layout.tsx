import { ReticleDev } from './reticle-dev';
import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PrivacyTelemetryBoot } from "@/app/components/PrivacyTelemetry";
import "./globals.css";

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
    { media: "(prefers-color-scheme: light)", color: "#F7F9FC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1220" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{process.env.NODE_ENV === 'development' ? <ReticleDev /> : null}
        <PrivacyTelemetryBoot />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
