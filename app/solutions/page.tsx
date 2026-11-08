import { MarketingShell } from "@/components/marketing-shell";
import { SolutionFinder } from "@/components/solution-finder";

export default function SolutionsPage() { return <MarketingShell><section className="page-hero"><div className="shell"><h1>Find the service through your business goal.</h1><p>The rules are deterministic and auditable. If the answer is ambiguous, ENGINE//OS sends you to a guided quotation instead of guessing.</p></div></section><section className="section"><div className="shell" style={{ maxWidth: 980 }}><SolutionFinder /></div></section></MarketingShell>; }
