import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ENGINE//OS — NOTREAL ENGINE", template: "%s — ENGINE//OS" },
  description: "Configure, quote, and manage digital engineering services with NOTREAL ENGINE.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
