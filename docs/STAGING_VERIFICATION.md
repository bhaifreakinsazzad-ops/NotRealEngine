# Staging Verification Report — 2026-11-08 (Directive V13.0)

**Target Supabase Project:** `yamwmfgqqjwlfcjjkwzl` (`https://yamwmfgqqjwlfcjjkwzl.supabase.co`)  
**Hosted Staging URL:** `https://notrealengine.vercel.app` (HTTP 200 OK)  
**Verification Suite:** `scripts/verify-staging.mjs` (V13.0)  
**Machine-Readable Audit:** [`docs/staging-report.json`](./staging-report.json)

---

## 1. Test Execution Result Summary (`65/65 PASS`, `0 FAILED`, `0 BLOCKED`)

| Domain | Checks Passed | Key Invariants Verified |
|---|---:|---|
| **0. Staging Safety Guard** | `1/1` | Verified target project ref `yamwmfgqqjwlfcjjkwzl` and non-production mode (`ENGINE_OS_ENV=staging`) before provisioning synthetic test identities. |
| **1. Network & Reachability** | `1/1` | Live Supabase PostgREST endpoint reachable (`HTTP 401`). |
| **2. Credentials Gate** | `1/1` | Dual API keys (`NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`) validated. |
| **3. Schema Inventory** | `31/31` | All **30 canonical tables** verified in `public` schema (`profiles`, `organizations`, `organization_memberships`, `services`, `packages`, `price_versions`, `feature_definitions`, `configuration_drafts`, `project_briefs`, `leads`, `quotes`, `quote_items`, `quote_acceptances`, `orders`, `payment_transactions`, `invoices`, `projects`, `project_requirements`, `project_files`, `milestones`, `tasks`, `approvals`, `revision_requests`, `support_tickets`, `notifications`, `outbox_events`, `audit_logs`, `analytics_events`, `webhook_events`, `rate_limit_buckets`). |
| **4. Canonical Catalog** | `3/3` | Exact **12 canonical services** across **10 distinct categories**; `Launch Promotion` package locked as `orderable = false`, `status = 'pending_approval'`. |
| **5. RPC Security & Boundaries** | `2/2` | `public.decide_quote` verified in schema; direct `anon` call to `public.submit_project_brief` strictly rejected (`42501 permission denied`). |
| **6. Migration 0006 Hardening Audit** | `1/1` | Verified presence of `system_environment`, `current_user_is_super_admin`, `approve_commercial_terms`, and upgraded `initialize_project_from_order` in database or migration DDL. |
| **7. 5-Role Matrix, RLS & E2E Lifecycle** | `24/24` | Real Supabase Auth JWT sessions established for `Owner A`, `Admin A`, `Viewer A`, `Owner B`, and `Staff`. Verified profile self-staff escalation block, staff terms approval block, tenant isolation (`Org A` vs `Org B`), lead intake & qualification, quote creation (`STAGING-TEST-TERMS-V1.0`), cross-tenant quote read/accept block, atomic quote-to-order idempotency (`decide_quote`), customer order mutation block, order financial clearance gate (`amount_minor >= total_minor`), atomic RPC project provisioning (`initialize_project_from_order`), duplicate project creation block (`UNIQUE(order_id)`), requirement submission isolation, cross-tenant storage & child-record injection block, signed URL isolation, revision limit constraint enforcement (`revision_count <= revision_limit`), and client deliverable approval -> `delivered`. |
| **8. Storage Bucket Lockdown** | `2/2` | `project-files` bucket verified private (`public = false`); unauthenticated storage upload rejected. |

---

## 2. Test Environment Cleanup Result (`0 Unexpected Errors`)

- **Designated Stable Fixtures:** Immutable audit-trailed records (`quote_acceptances`, `audit_logs`) are anchored to designated synthetic fixtures (`staging-synthetic-signatory@staging.notrealengine.local` and `staging-synthetic-staff@staging.notrealengine.local`). These fixtures are permanently locked (`ban_duration: "876000h"`), stripped of organization memberships, and marked `is_staff = false`.
- **Ephemeral Identity Deletion:** All ephemeral test identities (`custAdminA`, `custViewerA`, `custB`) are deleted cleanly (foreign keys disassociated, leads cleaned up).
- **Deleted Mutable Test Entities:** Projects, orders, project briefs, and storage objects deleted.
- **Preserved Immutable Audit Records:** PostgreSQL `prevent_immutable_mutation` triggers preserved `quote_acceptances` and `audit_logs`.
- **Unexpected Cleanup Errors:** **`0 (Clean)`**.
