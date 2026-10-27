import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PwaRegister from "@/app/pwa-register";
import UsageTracker from "@/components/UsageTracker";
import "./globals.css";
import "./pwa.css";

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://village-wellness-spa.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Village Wellness Spa | Medical Aesthetics & Wellness",
    template: "%s | Village Wellness Spa",
  },
  description: "Village Wellness Spa — medical aesthetics, skin health, IV wellness and body contouring in Mississauga.",
  applicationName: "Village Wellness Spa",
  generator: "Next.js",
  keywords: ["Village Wellness Spa", "medical aesthetics", "skin health", "IV wellness", "body contouring", "Mississauga"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Village Wellness Spa",
    title: "Village Wellness Spa | Medical Aesthetics & Wellness",
    description: "Where beauty meets medical excellence.",
  },
  twitter: {
    card: "summary",
    title: "Village Wellness Spa | Medical Aesthetics & Wellness",
    description: "Where beauty meets medical excellence.",
  },
  icons: { icon: "/villagespa.jpg", apple: "/villagespa.jpg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Village Spa",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#E52B7C",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        <UsageTracker />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
