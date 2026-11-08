# ENGINE//OS — Next Implementation Actions Queue
Updated: 2026-11-08 by Gemini Coding Agent

This document tracks prioritized, actionable engineering batches.

---

### Completed Implementation Batches (M0–M8)

| Task ID | Milestone | Description | Status |
|---|---|---|---|
| **TASK-M4-01** | M4 | Quotation actions & customer decision UI (`/quotes/[id]`, RPC `decide_quote`) | COMPLETE |
| **TASK-M4-02** | M4 | Admin quotation builder & publishing center (`/admin/quotes`, snapshot creation) | COMPLETE |
| **TASK-M4-03** | M4 | Order lifecycle, state transitions & commercial snapshot (`/orders/[id]`, `/admin/orders`) | COMPLETE |
| **TASK-M5-01** | M5 | Client workspace, project progress & milestone tracking (`/dashboard/projects`) | COMPLETE |
| **TASK-M5-02** | M5 | Client requirements intake & status management (`/dashboard/projects/[id]/requirements`) | COMPLETE |
| **TASK-M5-03** | M5 | Authenticated file uploader & signed URL downloads (`/dashboard/projects/[id]/files`) | COMPLETE |
| **TASK-M5-04** | M5 | Formal deliverable review, approval & revision budgets (`/dashboard/projects/[id]/review`) | COMPLETE |
| **TASK-M6-01** | M6 | Admin leads triage & quote conversion (`/admin/leads`) | COMPLETE |
| **TASK-M6-02** | M6 | Admin production queue, milestone updates & deliverable handover (`/admin/projects`) | COMPLETE |
| **TASK-M6-03** | M6 | Admin pricing governance, minor unit schedule & catalog inspector (`/admin/pricing`, `/admin/services`) | COMPLETE |
| **TASK-M7-01** | M7 | Durable outbox processor worker with exponential backoff (`lib/integrations/outbox-worker.ts`) | COMPLETE |
| **TASK-M7-02** | M7 | Payment gateway adapter & signature-validated webhook receiver (`lib/integrations/payments`) | COMPLETE |
| **TASK-M7-03** | M7 | Pre-registration opaque-token draft persistence & account claim API (`app/api/drafts`) | COMPLETE |
| **TASK-M8-01** | M8 | Comprehensive unit test suite expansion (36 tests across 9 files) | COMPLETE |
| **TASK-M8-02** | M8 | Playwright E2E test suite covering legal draft banners, discovery, and auth perimeters (22 tests) | COMPLETE |

---

### Next Pending Actions (Production Preparation & External Milestones)

#### [TASK-OPS-01] Staging Environment Provisioning
- **Priority:** High (P1)
- **Milestone:** Staging Release
- **Dependencies:** Supabase cloud project, GitHub repository access
- **Required Inputs:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Actions:**
  1. Apply existing migrations `202611080001_engine_os_foundation.sql` and `202611080002_seed_canonical_services.sql` to staging Supabase instance.
  2. Verify RLS across two distinct test organizations.
  3. Seed initial staff profile (`is_staff: true`).
- **Verification:**
  - Automated integration run against live Supabase instance.

---

#### [TASK-OPS-02] Payment Gateway Credentials & Webhook Activation
- **Priority:** Gated (Owner Approval Required)
- **Milestone:** Commercial Activation
- **Dependencies:** Merchant account approval (SSLCommerz, Stripe, bKash/Nagad)
- **Required Inputs:**
  - Gateway API credentials and signing secrets.
- **Actions:**
  1. Configure secrets in environment.
  2. Wire payment provider webhook endpoint to gateway dashboard.
  3. Perform test sandbox transaction and verify idempotent order state progression to `confirmed`.

---

#### [TASK-OPS-03] Transactional Email & Messaging Dispatch
- **Priority:** Gated (Owner Approval Required)
- **Milestone:** Communications Activation
- **Dependencies:** Provider setup (Postmark, Resend, or SendGrid)
- **Required Inputs:**
  - Verified sender domain and API key.
- **Actions:**
  1. Plug provider client into `lib/integrations/outbox-worker.ts` handler map.
  2. Schedule periodic outbox runner (cron / Vercel Cron / serverless task).
  3. Verify delivery of lead confirmation and quotation notice emails.

---

#### [TASK-OPS-04] Legal Copy Finalization & Production Sign-off
- **Priority:** Gated (Owner / Legal Counsel Required)
- **Milestone:** Production Launch
- **Dependencies:** Reviewed legal text for Terms of Service, Privacy Policy, and Refund Policy.
- **Actions:**
  1. Replace draft placeholders in `/privacy`, `/terms`, `/refund-policy` with approved legal text.
  2. Remove DRAFT warning banners upon written sign-off.
  3. Execute production deployment to custom domain.
