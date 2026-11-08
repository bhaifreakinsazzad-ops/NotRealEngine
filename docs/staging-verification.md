# ENGINE//OS — Staging Verification Report (Directive V13.0)

**Target Staging Project:** `yamwmfgqqjwlfcjjkwzl` (`https://yamwmfgqqjwlfcjjkwzl.supabase.co`)  
**Hosted Staging URL:** `https://notrealengine.vercel.app` (HTTP 200 OK)  
**Verification Suite:** `scripts/verify-staging.mjs` + `tests/e2e/flows.spec.ts`  
**Machine-Readable Audit:** [`docs/staging-report.json`](./staging-report.json)

---

## 1. Staging Verification Summary

| Suite | Total Checks | Passed | Failed | Blocked | Unexpected Cleanup Errors |
|---|---:|---:|---:|---:|---:|
| **Database & 5-Role Matrix (`npm run verify:staging`)** | 65 | 65 | 0 | 0 | 0 (Clean) |
| **Unit & Regression Suite (`npm test`)** | 65 | 65 | 0 | 0 | N/A |
| **Playwright Browser E2E (`npm run test:e2e`)** | 27 active (1 mobile skip) | 27 | 0 | 0 | 0 (Clean) |

---

## 2. Remote Database Migration `0006` Status

- **Migrations `0001`–`0004`:** Active and verified on `yamwmfgqqjwlfcjjkwzl` (30/30 tables, 12 canonical services across 10 categories, private `project-files` bucket, `anon` blocked from `submit_project_brief` with `42501`).
- **Migration `0006` (`supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql`):**
  - **Application / Server-Action Layer:** **100% Active & Verified** (`app/quotes/actions.ts`, `app/admin/quotes/actions.ts`, `app/admin/orders/actions.ts`, `lib/domain/quotes.ts`). All operations fail closed to `'production'` unless `ENGINE_OS_ENV === 'staging'`. Unsafe client-side fallback is eliminated; `initialize_project_from_order` RPC is the sole authoritative transactional path.
  - **PostgreSQL DDL Layer:** Authored in `supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql` and incorporated in `supabase/bootstrap.sql`. Ready for one-time paste into the **Supabase Dashboard SQL Editor** for `yamwmfgqqjwlfcjjkwzl`.

---

## 3. Role Matrix Verification (`decide_quote`, `submit_project_brief`, `approve_commercial_terms`)

| Role / Identity | `submit_project_brief` (Route) | `submit_project_brief` (RPC) | `decide_quote` (Action) | `decide_quote` (RPC) | `approve_commercial_terms` (RPC) |
|---|---|---|---|---|---|
| **Anonymous (`anon`)** | Allowed (Rate-limited, HMAC hashed) | **REJECTED (`42501`)** | **REJECTED (Redirects)** | **REJECTED (`42501`)** | **REJECTED (`42501`)** |
| **Organization Owner (`custA`)** | Allowed via Route | Revoked in DDL | **ALLOWED** (Non-draft terms) | **ALLOWED** | **REJECTED (`unauthorized`)** |
| **Organization Admin (`custAdminA`)** | Allowed via Route | Revoked in DDL | **ALLOWED** (Non-draft terms) | **ALLOWED** | **REJECTED (`unauthorized`)** |
| **Organization Viewer (`custViewerA`)** | Allowed via Route | Revoked in DDL | **REJECTED (`owner/admin required`)** | Blocked (`is_org_admin`) | **REJECTED (`unauthorized`)** |
| **Unrelated Customer (`custB`)** | Allowed via Route | Revoked in DDL | **REJECTED (404 Not Found)** | **REJECTED (`quote_not_found`)** | **REJECTED (`unauthorized`)** |
| **Ordinary Staff (`staff`)** | Allowed via Route | Revoked in DDL | Staff manages via `/admin/quotes` | Staff override | **REJECTED (`super_admin required`)** |
| **Founder Super-Admin** | Allowed via Route | Revoked in DDL | Full administrative control | Full administrative control | **ALLOWED** |

---

## 4. Test Environment Cleanup Audit

`scripts/verify-staging.mjs` tracks every provisioned resource ID and separates **TEST EXECUTION RESULT** from **TEST ENVIRONMENT CLEANUP RESULT**:
- **Designated Stable Synthetic Fixtures:** Used for immutable audit trails (`quote_acceptances`, `audit_logs`). Fixed to `staging-synthetic-signatory` and `staging-synthetic-staff`, banned for 100 years, stripped of memberships, and verified `is_staff = false`.
- **Ephemeral User Clean Deletion:** Ephemeral users are deleted without foreign-key conflict errors.
- **Deleted Mutable Entities:** Projects, orders, project briefs, storage objects deleted.
- **Preserved Immutable Records:** Preserved by PostgreSQL triggers.
- **Unexpected Cleanup Errors:** **`0 (Clean)`**.
