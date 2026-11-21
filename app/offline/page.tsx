import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata = {
  title: "Offline — NotRealEngine",
  description: "Reconnect to continue using NotRealEngine and NRE OFFICE.",
};

export default function OfflinePage() {
  return (
    <MarketingShell>
      <section className="page-hero">
        <div className="shell">
          <div className="section-code">CONNECTION STATUS</div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <WifiOff size={44} className="cyan" />
            <span>You are currently offline.</span>
          </h1>
          <p>
            For data security, authenticated NRE OFFICE workspaces, quotes, orders, and API
            actions require an active connection. Reconnect to continue where you left off.
          </p>
          <div className="hero-actions" style={{ marginTop: "2rem" }}>
            <Link href="/" className="btn btn-primary">
              <RefreshCw size={16} />
              <span>Retry connection</span>
            </Link>
            <Link href="/services" className="btn">
              View Services
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
