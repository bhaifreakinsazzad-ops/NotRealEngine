# ENGINE//OS — Production Readiness & Release Governance (Directive V13.0)

**Company:** NOTREAL ENGINE, LLC  
**Platform:** ENGINE//OS  
**Current Stage:** **`STAGING E2E VERIFIED`** / **`RELEASE A READY FOR FOUNDER APPROVAL`**

---

## 1. Release A, Release B, and Release C Readiness Matrix

| Release Tier | Scope | Current Status | Blocking / Gate Conditions |
|---|---|---|---|
| **Release A** | Public marketing, 10-category / 12-offer catalog, rule-grounded Solution Finder, Project Brief intake, Admin Lead triage, Quotation creation, Client read/review | **`RELEASE A READY FOR FOUNDER APPROVAL`** | 1. Paste `supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql` in Supabase SQL Editor.<br>2. Confirm founder super-admin promotion via `scripts/promote-founder-admin.mjs` or direct SQL.<br>3. Point custom domain when ready. |
| **Release B** | Binding Customer Quote Acceptance, Order Confirmation, Project Provisioning, Requirements, Private File Storage, Revisions & Approvals | **`STAGING E2E VERIFIED`** (Non-Binding Staging Mode) | Held for binding production orders until founder approves production commercial terms (`public.approve_commercial_terms` RPC requiring `super_admin`). |
| **Release C** | Live Online Payment Gateways (`SSLCommerz`, `bKash`, `Stripe`) & Automated Transactional Notifications (`Resend`) | **`CODE IMPLEMENTED` (GATED)** | Remains disabled (`PAYMENTS_ENABLED=false`, `NOTIFICATIONS_ENABLED=false`) until live merchant credentials, webhook secrets, and refund/privacy legal texts are approved. |

---

## 2. Legal Terms Governance (V13.0)

- `ENGINE//OS-TERMS-V1.0` and `STANDARD-V1.0` are classified as **`draft`** by default. Quotes using draft terms can be reviewed by clients, but the **"Accept Quotation & Order"** button is disabled (`Acceptance Held (Draft Terms)`) and server action `decideQuoteAction` rejects binding acceptance.
- `STAGING-TEST-TERMS-V1.0` is classified as **`staging_synthetic`**. It enables end-to-end non-binding acceptance testing in staging (`ENGINE_OS_ENV=staging`) and is automatically blocked when `ENGINE_OS_ENV !== 'staging'` (fail-safe closed to production).
- Ordinary staff are strictly blocked from promoting terms to `approved_production`. Only founder super-admins can execute `approve_commercial_terms`.
- Public legal pages (`/privacy`, `/terms`, `/refund-policy`) visibly display `DRAFT — NOT APPROVED FOR PUBLICATION OR ACCEPTANCE`.

---

## 3. Order Financial Clearance & Atomic Project Provisioning (V13.0)

- Unpaid orders (`awaiting_payment`) cannot transition to `confirmed`, `in_production`, or `completed` unless:
  1. A verified `paid` row exists in `public.payment_transactions` (`state = 'paid'`, `currency = order.currency`, `amount_minor >= order.total_minor`, and `verified_at IS NOT NULL`), **OR**
  2. An authorized staff admin records an explicit **Audited Manual Settlement** (`reference`, `method`, `note`, `approvedBy`, `approvedAt`) stored in `orders.commercial_snapshot.settlement` and `public.audit_logs`. Staging settlement methods are strictly rejected outside staging.
- Project provisioning (`initializeProjectFromOrderAction` & `public.initialize_project_from_order`):
  - Sole authoritative path: atomic PostgreSQL RPC `public.initialize_project_from_order`.
  - Unsafe client-side compensating fallback eliminated.
  - Verifies financial clearance internally before creating project records.
  - Validates canonical `service_id` against the 12-offer catalog.
  - Atomic transaction: project, milestones, requirements, audit log, and outbox event commit together or roll back completely.
