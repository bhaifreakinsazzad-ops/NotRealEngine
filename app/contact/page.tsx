import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
export default function ContactPage() { return <MarketingShell><section className="page-hero"><div className="shell"><h1>Start with a structured project request.</h1><p>The project builder collects the information needed for a useful first review without asking you to translate your business into technical specifications.</p><div style={{ marginTop: "2rem" }}><Link className="btn btn-primary" href="/build">Open the project builder</Link></div></div></section></MarketingShell>; }
