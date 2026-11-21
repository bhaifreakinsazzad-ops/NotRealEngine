import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/chat-widget";
import { QuickConnect } from "@/components/quick-connect";
import { OfflineIndicator, ServiceWorkerRegistrar } from "@/components/pwa-controls";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#05070C",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: { default: "NotRealEngine — NRE OFFICE & Digital Engineering", template: "%s — NotRealEngine" },
  description:
    "Designed to impress. Engineered to work. Configure 22 canonical digital engineering services, explore NRE LAB tools, and manage delivery in NRE OFFICE.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  applicationName: "NRE OFFICE",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NRE OFFICE",
  },
  icons: {
    icon: [
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "NotRealEngine — Digital Engineering & NRE OFFICE",
    description:
      "Designed to impress. Engineered to work. 22 canonical digital services, NRE PULSE technical care, free NRE LAB tools, and transparent project delivery.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${notoSansBengali.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <OfflineIndicator />
        {children}
        <QuickConnect />
        <ChatWidget />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
