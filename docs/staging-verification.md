# ENGINE//OS — Staging Verification Report (Directive V12.0)

**Target Staging Project:** `yamwmfgqqjwlfcjjkwzl` (`https://yamwmfgqqjwlfcjjkwzl.supabase.co`)  
**Verification Suite:** `scripts/verify-staging.mjs` + `tests/e2e/flows.spec.ts`  
**Machine-Readable Audit:** [`docs/staging-report.json`](./staging-report.json)

---

## 1. Staging Verification Summary

| Suite | Total Checks | Passed | Failed | Blocked | Unexpected Cleanup Errors |
|---|---:|---:|---:|---:|---:|
| **Database & 5-Role Matrix (`npm run verify:staging`)** | 62 | 62 | 0 | 0 | 0 (Clean) |
| **Unit & Regression Suite (`npm test`)** | 66 | 66 | 0 | 0 | N/A |
| **Playwright Browser E2E (`npm run test:e2e`)** | 27 active (1 mobile skip) | 27 | 0 | 0 | 0 (Clean) |

---

## 2. Remote Database Migration `0005` Status

- **Migrations `0001`–`0004`:** Active and verified on `yamwmfgqqjwlfcjjkwzl` (30/30 tables, 12 canonical services across 10 categories, private `project-files` bucket, `anon` blocked from `submit_project_brief` with `42501`).
- **Migration `0005` (`supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql`):**
  - **Application / Server-Action Layer:** **100% Active & Verified** (`app/quotes/actions.ts`, `app/admin/quotes/actions.ts`, `app/admin/orders/actions.ts`, `lib/domain/quotes.ts`).
  - **PostgreSQL DDL Layer:** Prepared in `supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql` (and `supabase/bootstrap.sql`). Ready for one-time paste into the **Supabase Dashboard SQL Editor** for `yamwmfgqqjwlfcjjkwzl` to enforce `REVOKE EXECUTE ON FUNCTION public.submit_project_brief FROM authenticated`, create `public.commercial_terms_versions`, enforce `is_org_admin` + terms classification inside `public.decide_quote`, attach trigger `orders_financial_clearance_guard`, and create `public.initialize_project_from_order`.

---

## 3. Role Matrix Verification (`decide_quote` & `submit_project_brief`)

| Role / Identity | `submit_project_brief` (App Route `/api/project-briefs`) | `submit_project_brief` (Direct PostgREST RPC) | `decide_quote` (App Server Action `decideQuoteAction`) | `decide_quote` (Direct PostgREST RPC) |
|---|---|---|---|---|
| **Anonymous (`anon`)** | Allowed (Rate-limited, server-hashed, `service_role`) | **REJECTED (`42501`)** | **REJECTED (Redirects to `/login`)** | **REJECTED (`42501`)** |
| **Organization Owner (`custA`)** | Allowed via `/api/project-briefs` | Revoked in `0005` DDL | **ALLOWED** (Validates non-draft terms) | **ALLOWED** |
| **Organization Admin (`custAdminA`)** | Allowed via `/api/project-briefs` | Revoked in `0005` DDL | **ALLOWED** (Validates non-draft terms) | **ALLOWED** |
| **Organization Viewer (`custViewerA`)** | Allowed via `/api/project-briefs` | Revoked in `0005` DDL | **REJECTED (`owner` or `admin` required)** | Blocked in `0005` DDL (`is_org_admin`) |
| **Unrelated Customer (`custB`)** | Allowed via `/api/project-briefs` | Revoked in `0005` DDL | **REJECTED (404 / Not Found)** | **REJECTED (`quote_not_found`)** |
| **Staff (`staff`)** | Allowed via `/api/project-briefs` | Revoked in `0005` DDL | Staff manages via `/admin/quotes` | Allowed for staff administrative override |

---

## 4. Test Environment Cleanup Audit

`scripts/verify-staging.mjs` tracks every provisioned resource ID and separates **TEST EXECUTION RESULT** from **TEST ENVIRONMENT CLEANUP RESULT**:
- **Deleted per run:** `4/5` Auth users (including synthetic `staff`, `custAdminA`, `custViewerA`, `custB`), `1/1` projects, `1/1` orders, `2/2` project briefs, `1/1` storage objects (`0` unexpected cleanup errors).
- **Preserved Immutable Audit Records:** `quote_acceptances` and `audit_logs` enforce PostgreSQL `BEFORE UPDATE OR DELETE` immutability triggers (`prevent_immutable_mutation`). The 1 non-staff signatory profile referenced by `quote_acceptances.accepted_by` is permanently locked (`ban_duration: "876000h"`), stripped of all organization memberships, and verified with `is_staff = false`.
