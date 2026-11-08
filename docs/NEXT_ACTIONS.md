# ENGINE//OS — Next Implementation Actions Queue
Updated: 2026-11-08 by Gemini Coding Agent (Directive V6.0 Review)

This document tracks prioritized, actionable engineering batches.

---

### Immediate Next Implementation Batches

#### [TASK-OPS-01] Staging Database Deployment & Multi-Tenant Audit
- **Priority:** Critical (P0)
- **Status:** BLOCKED pending credentials
- **Dependencies:** Staging Supabase project credentials (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- **Required Work:**
  1. Apply `202611080001_engine_os_foundation.sql` and `202611080002_seed_canonical_services.sql` to staging database.
  2. Verify all 24 public tables, RLS policies, and RPCs (`decide_quote`, `submit_project_brief`).
  3. Create isolated synthetic test identities (Staff, Customer A, Customer B).
  4. Execute two-tenant isolation verification (Journey 1 & Journey 2 from `docs/STAGING_VERIFICATION.md`).

---

#### [TASK-LEGAL-01] Legal Copy Integration
- **Priority:** High (P1)
- **Status:** BLOCKED pending founder/counsel text
- **Dependencies:** Approved copy for Privacy Policy, Terms of Service, and Refund Policy
- **Required Work:**
  1. Replace draft placeholders in `app/privacy/page.tsx`, `app/terms/page.tsx`, and `app/refund-policy/page.tsx`.
  2. Remove `DRAFT — NOT APPROVED` warning banners upon written authorization.

---

#### [TASK-PAY-01] Payment Gateway Sandbox Test
- **Priority:** High (P1)
- **Status:** GATED pending merchant sandbox credentials
- **Dependencies:** SSLCommerz / Stripe test API keys
- **Required Work:**
  1. Configure sandbox secrets in environment.
  2. Execute end-to-end sandbox transaction against `/api/webhooks/payment`.
  3. Verify order transition to `confirmed` and transaction audit entry.

---

#### [TASK-MAIL-01] Transactional Outbox Scheduling
- **Priority:** Medium (P2)
- **Status:** Ready for scheduling
- **Dependencies:** Cron schedule runner (e.g. Vercel Cron or GitHub Actions)
- **Required Work:**
  1. Configure periodic POST request to `/api/cron/outbox` with `Authorization: Bearer <CRON_SECRET>`.
  2. When email provider credentials are provided, toggle `NOTIFICATIONS_ENABLED=true`.
