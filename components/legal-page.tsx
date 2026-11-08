import { MarketingShell } from "@/components/marketing-shell";

export function LegalPage({
  title,
  children
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <MarketingShell>
      <section className="page-hero">
        <div className="shell">
          <h1>{title}</h1>
          <div className="legal-draft" role="alert">
            <strong>DRAFT — NOT APPROVED FOR PUBLICATION OR ACCEPTANCE.</strong>
            <br />
            Founder and legal counsel review are required before this document can become legally binding. The disclosures below describe current technical architecture and operational processors for transparency.
          </div>
          {children || <p>No final legal language has been approved in this repository.</p>}
        </div>
      </section>
    </MarketingShell>
  );
}
