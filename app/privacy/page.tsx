import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy (Draft Notice)">
      <div className="privacy-disclosure-content" style={{ marginTop: "2rem", lineHeight: 1.7, color: "var(--silver)" }}>
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ color: "var(--text)", fontSize: "1.35rem" }}>1. Architectural Overview & Data Controller</h2>
          <p>
            NOTREAL ENGINE, LLC operates ENGINE//OS. This draft privacy notice outlines how technical data, project inquiries, and customer communications are collected, processed, and stored across our digital infrastructure.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ color: "var(--text)", fontSize: "1.35rem" }}>2. Operational Sub-Processors & External Services</h2>
          <p>
            To deliver web application services, technical scoping, and direct customer interactions, ENGINE//OS interfaces with the following infrastructure and service providers:
          </p>
          <ul style={{ paddingLeft: "1.5rem", marginTop: "0.75rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Vercel Inc. (United States):</strong> Serverless application hosting, edge network routing, and static asset distribution.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Supabase Inc. (AWS United States):</strong> Primary PostgreSQL database, user authentication (GoTrue), audit logging, and private encrypted object storage (`project-files`).
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>LeadConnector / GoHighLevel:</strong> Third-party provider for embedded consultation scheduling calendars, customer discovery forms, and customer support chat loaders.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ color: "var(--text)", fontSize: "1.35rem" }}>3. Inbound Inquiries, Forms & Embedded Widgets</h2>
          <p>
            When submitting project briefs, scheduling consultation calls, or engaging with chat widgets:
          </p>
          <ul style={{ paddingLeft: "1.5rem", marginTop: "0.75rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              Inquiries submitted through our native Project Builder (`/build`) are processed server-side via trusted IP extraction, HMAC-hashed rate limiting, and encrypted PostgreSQL persistence.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              External booking calendars and onboarding forms embedded via `leadconnectorhq.com` execute within cross-origin sandboxed iframes. Submissions are transmitted directly to the CRM provider and synchronized to ENGINE//OS operations via secure webhook endpoints.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              The LeadConnector chat widget script is loaded asynchronously using `lazyOnload` strategies to minimize main thread blocking and preserve Core Web Vitals.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ color: "var(--text)", fontSize: "1.35rem" }}>4. Cookies, Local Storage & User Choices</h2>
          <p>
            ENGINE//OS utilizes essential session cookies solely for user authentication and security perimeter defense. Embedded third-party widgets may utilize their own cookies or local storage partitions per their respective privacy policies. You can control cookie preferences through standard browser privacy settings.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ color: "var(--text)", fontSize: "1.35rem" }}>5. Governance & Contact</h2>
          <p>
            This draft document does not constitute approved legal text. To exercise privacy rights, request data deletion, or inquire about data handling, contact:
            <br />
            <strong className="cyan" style={{ display: "block", marginTop: "0.5rem" }}>
              NOTREAL ENGINE, LLC · Operations & Legal Desk · contact@notrealengine.online
            </strong>
          </p>
        </section>
      </div>
    </LegalPage>
  );
}
