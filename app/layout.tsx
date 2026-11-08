import type { Metadata } from "next";
import "./globals.css";
import { ChatWidget } from "@/components/chat-widget";
import { QuickConnect } from "@/components/quick-connect";

export const metadata: Metadata = {
  title: { default: "ENGINE//OS — NOTREAL ENGINE", template: "%s — ENGINE//OS" },
  description: "Configure, quote, and manage digital engineering services with NOTREAL ENGINE.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: "https://assets.cdn.filesafe.space/1iUkTwVsmyz7T0PnMiFY/media/6a05c84eab5d7da865927829.png",
    apple: "https://assets.cdn.filesafe.space/1iUkTwVsmyz7T0PnMiFY/media/6a05c84eab5d7da865927829.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <QuickConnect />
        <ChatWidget />
      </body>
    </html>
  );
}
