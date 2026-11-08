# ENGINE//OS — Founder Approvals & Decisions Register
Version: 1.0 · Date: 2026-11-08 · Author: Gemini Coding Agent

---

## 1. Governance Principles

In accordance with NOTREAL ENGINE corporate policy and the **Master Directive**:
- Engineering builds and verifies capabilities in code.
- **Founder retains exclusive authority** over commercial terms, pricing versions, legal commitments, financial transactions, and production deployment.
- **Security Rule:** Sensitive production credentials and secrets must NEVER be transmitted in ordinary chat messages; configure them directly in your secure hosting dashboard or environment manager.

---

## 2. Decision & Action Register

### Decision 1: Staging Supabase Project Provisioning
- **Exact Requirement:** Provide staging Supabase project credentials in your staging host environment (`.env.staging` or hosting secrets):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Where to Configure:** Staging Hosting Provider (Vercel / Cloudflare / Docker) environment settings.
- **Why Required:** Connects the application to a real PostgreSQL instance to verify database RLS, RPCs, storage uploads, and cross-browser persistence.
- **Release Impact:** Blocks Staging Verification; Does NOT block local code completion.
- **Recommended Option:** Create a free/pro tier project named `notrealengine-staging` in Supabase Cloud.

---

### Decision 2: Legal Agreements Sign-off
- **Exact Requirement:** Supply counsel-approved text for:
  1. Privacy Policy (`app/privacy/page.tsx`)
  2. Terms of Service (`app/terms/page.tsx`)
  3. Refund Policy (`app/refund-policy/page.tsx`)
- **Where to Configure:** Replace component copy in `components/legal-page.tsx` or route files.
- **Why Required:** Current pages display visible `DRAFT — NOT APPROVED` banners. Real customer intake in production requires binding disclosures.
- **Release Impact:** **Blocks Release A (Public Launch)**; Does NOT block Staging Verification.
- **Recommended Option:** Provide standard commercial digital services agreements tailored to Bangladesh and international clients.

---

### Decision 3: Commercial Price Schedule Approval
- **Exact Requirement:** Formalize pricing schedule in `public.price_versions`:
  - Single Page Website promotion: BDT 999 (Minor units: `99900`).
  - Regular tier pricing across all 12 canonical services.
- **Where to Configure:** Staff Operations Center at `/admin/pricing` via "Approve & Activate" form.
- **Why Required:** ENGINE//OS enforces strict commercial gating: unapproved price versions remain quote-only and cannot be purchased directly.
- **Release Impact:** Blocks Release C (Direct Automated Checkout); Does NOT block Release A or B (Quotation flows).
- **Recommended Option:** Keep complex services (Web Applications, PWA, Custom Engineering) as Guided Quote; activate fixed promotional tiers for Mini & Single Page Websites.

---

### Decision 4: Payment Gateway Credentials & Webhook Setup
- **Exact Requirement:** Provide merchant API credentials for target gateway:
  - Domestic (BDT): SSLCommerz Store ID & Store Password.
  - International (USD): Stripe API Secret Key & Webhook Signing Secret.
- **Where to Configure:** Staging / Production host environment variables (`PAYMENT_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, etc.).
- **Why Required:** Activates online payment processing and real-time order confirmation via cryptographic webhook listener (`app/api/webhooks/payment`).
- **Release Impact:** **Blocks Release C (Automated Payments)**; Does NOT block Release A (Leads) or Release B (Client Workspace with manual invoice clearance).
- **Recommended Option:** Start with SSLCommerz sandbox for BDT testing and Stripe sandbox for international testing.

---

### Decision 5: Transactional Email / SMS Provider Setup
- **Exact Requirement:** Provide transactional mail API key (Resend or Postmark) and verify domain DNS records (SPF, DKIM).
- **Where to Configure:** Host environment variables (`RESEND_API_KEY`, `NOTIFICATIONS_ENABLED=true`).
- **Why Required:** Enables outbox worker to deliver automated emails for lead submission confirmations, quotation ready notices, and order receipts.
- **Release Impact:** Blocks automated email delivery in Release C; in Release A/B, events are safely queued in `outbox_events` without breaking workflows.
- **Recommended Option:** Use Resend or Postmark with subdomain `mail.notrealengine.online`.

---

### Decision 6: Production Domain Cutover Authorization
- **Exact Requirement:** Explicit authorization to point `notrealengine.online` DNS records to ENGINE//OS production deployment.
- **Where to Configure:** Domain Registrar / DNS Management console.
- **Why Required:** Protects existing marketing infrastructure until the new platform has passed full staging acceptance.
- **Release Impact:** **Blocks Production Live Cutover**.
- **Recommended Option:** Deploy first to `staging.notrealengine.online` or a preview URL before scheduling production cutover.
