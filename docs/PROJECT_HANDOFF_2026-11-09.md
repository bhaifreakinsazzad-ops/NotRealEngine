# ENGINE//OS — Project Status & Handoff
**Company:** NOTREAL ENGINE, LLC  
**Snapshot:** 2026-11-10 (Bangladesh time)  
**Status:** ACTIVE EXECUTION (Directive V21.0 — Final Security Closure, Environment Isolation, Database Activation & Real Release A Verification)  
**Project:** https://github.com/bhaifreakinsazzad-ops/NotRealEngine  
**Local working folder:** E:\Agentic Work Station\Web Applications\NotRealEngine  
**Active Working Branch:** `feature/v18-release-a-finalization`

## 1. Goal and scope
ENGINE//OS is NOTREAL ENGINE's premium, self-service digital-services website and operating platform. Planned journey: **Visitor → Solution Finder → Six-Step Project Builder → Lead → Admin Quote → Customer Order → Project Workspace → Requirements/Files → Milestones/Revisions → Approval/Delivery**. Native Admin and Customer workspaces are at **/admin** and **/dashboard**. The catalog has **10 categories / 12 core services** (websites, funnels, e-commerce, custom web and mobile apps, SaaS, dashboards and client portals). The only preapproved promotional price is **BDT 999 for a Single Page Website**; other prices, binding terms, legal copy, payment activation and launch require founder approval.

## 2. Starting condition and progress to date
- **Original state:** Local Next.js/React/TypeScript/Supabase application and a business specification existed, but code had initially not reached the newly created GitHub repository; real database migrations, hosted access and end-to-end business verification were blocked or unproven.
- **Gemini phase (V6–V14):** Implemented and iterated the public website, canonical catalog, Solution Finder, six-step Builder, lead intake, Supabase Auth/RLS/private Storage, Admin Inbox, quotation and order workflows, client projects, revisions/approvals, outbox/payment adapters, branding/media and embedded LeadConnector booking, forms and chat. Migrated the source to GitHub and established a Vercel deployment. Added database migration files **0001–0006**, local and staging-check scripts, and deployment documentation.
- **Claude Code takeover (V16):** Committed fail-closed LeadConnector webhook authentication (**4c502bf**); transactional, event-keyed lead ingestion and migration **0007** (**d7ae40d**); corrected migration documentation (**701de43**); and documented environment separation/added hosted Playwright base URL support (**0300a9c**).
- **Gemini Master Directive V18.0 Execution:**
  - Resolved LeadConnector event-identity collisions and payload conflict handling.
  - Eliminated deceptive verification reporting in staging script.
  - Prepared turnkey composite migration `supabase/migrations/APPLY_0006_AND_0007.sql`.
- **Gemini Master Directive V19.0 Execution (Critical Safety & Verification Hardening):**
  - **Eliminated Mutating RPC Migration Probes:** Removed dangerous calls (`approve_commercial_terms`, `set_system_environment`, `ingest_leadconnector_event`) from the verification script.
  - **Read-Only Metadata & Schema Audit:** Built 100% read-only PostgREST OpenAPI metadata inspection evaluating tables, columns, RPC signatures, and pure `SELECT` queries without state mutation.
  - **Semantic Payload Hashing for LeadConnector:** Implemented deterministic, key-sorted JSON canonicalization filtering transient transport metadata.
  - **Layered Verification Architecture:** Re-architected `verify:staging` into 4 distinct verification layers (Layers A through D).
  - **Regression Test Suite:** Added 11 new automated regression tests (97/97 tests passing across 12 suites).
- **Gemini Master Directive V20.0 Execution (Final Integration, Database Activation & Protected Staging):**
  - **Git History Reconciliation:** Reconciled `origin/main` (commit `26dd3b0`) with `feature/v18-release-a-finalization` cleanly with zero merge conflicts.
  - **Standalone Migration Audit CLI (`npm run audit:migrations`):** Created dedicated CLI tool `scripts/audit-migrations.mjs` executing strictly read-only inspection and writing `docs/migration-audit-report.json`.
  - **Two-Level Verification Truth Architecture:** Clearly demarcated Level 1 (API Schema) from Level 2 (PostgreSQL Catalog).
  - **Production Safety Hardening in Staging Runner:** Injected fail-closed check preventing execution if targets point to `app.notrealengine.online`.
  - **Run-Scoped User Cleanup:** Replaced broad email domain sweeps with run-scoped tracking, proving 0 residual test users.
  - **Expanded Test Coverage:** Added unit tests verifying two-level audit distinction (99/99 Vitest tests passing across 12 suites).
- **Gemini Master Directive V21.0 Execution (Final Security Closure, Environment Isolation & Genuine Catalog Audit):**
  - **Eliminated Level 2 Hardcoded Mock:** Replaced placeholder `level2Status = "PASS"` in `scripts/audit-migrations.mjs` with authentic PostgreSQL catalog queries (`pg_namespace`, `pg_class`, `pg_attribute`, `pg_proc`, `pg_policy`, `pg_trigger`, `pg_constraint`, `information_schema.routine_privileges`, `supabase_migrations.schema_migrations`) executed using `pg` in an explicit `BEGIN TRANSACTION READ ONLY` session with strict TLS certificate verification (`rejectUnauthorized: true`).
  - **Audit Exit Code & Unified Readiness Gate:** Implemented `evaluateOverallAuditStatus` combining Level 1 and Level 2. The audit CLI and staging runner exit with code 1 if any mandatory check is `BLOCKED` or `FAIL`. Truthfully labels overall audit status as `BLOCKED: RELEASE BLOCKED (Exit 1)` until both migration schemas and direct catalog inspections execute and pass.
  - **Fail-Closed Environment & Origin Allowlist Enforcement:** Hardened `scripts/verify-staging.mjs` with 4 fail-closed safety guards:
    1. Requires explicit `ENGINE_OS_ENV === "staging"` (removed default `"staging"` fallback).
    2. Enforces `https:` and approved project ref prefix (`yamwmfgqqjwlfcjjkwzl`) via `new URL()` hostname parsing.
    3. Blocks production hosts (`app.notrealengine.online`, `notrealengine.online`, `notrealengine.vercel.app`) and requires localhost or approved staging origin allowlist.
    4. Deliberate Mutation Authorization Gate: Requires explicit `--allow-mutation` CLI flag or `ALLOW_STAGING_MUTATION=true` env var before creating any synthetic records.
  - **Expanded Vitest Test Coverage (111/111 Passing):** Added 12 new V21.0 regression tests (`V21.1`–`V21.12`) verifying catalog error classification, read-only session isolation, strict TLS validation, and exit code gate semantics.

## 3. Current verified repository and deployment
| Area | Verified snapshot |
|---|---|
| GitHub main | **26dd3b0155202aa69ff73666953af2ba58396751** (PR #5 merged) |
| Active feature branch | `feature/v18-release-a-finalization` (ahead with V21.0 commits) |
| Vercel project | **notrealengine** |
| Latest Vercel deployment | **dpl_E6btjEpgWVHD46qMcBjJLEP3WLW4** — READY, **production** target |
| Public aliases | https://app.notrealengine.online and https://notrealengine.vercel.app |
| Supabase staging project reference | **yamwmfgqqjwlfcjjkwzl** |
| Remote database migration status | **0001–0005 APPLIED & VERIFIED**; **0006 & 0007 READY in APPLY_0006_AND_0007.sql** |

## 4. Implementation and quality evidence
- **TypeScript Typecheck:** PASS (0 errors via `npm run typecheck`).
- **ESLint:** PASS (0 errors, 0 warnings via `npm run lint`).
- **Unit & Regression Suite:** PASS (111/111 Vitest tests across 12 test suites via `npm test`).
- **Next.js Production Build:** PASS (37/37 routes compiled statically/dynamically via `npm run build`).
- **Migration Audit CLI (`npm run audit:migrations`):** Level 1 API Schema evaluated, Level 2 Catalog truthfully reported as BLOCKED without port 5432 direct connection, 0 mutating calls, exits with code 1.
- **Staging Verification Suite (`npm run verify:staging -- --allow-mutation`):** 66 PASS, 0 FAIL, 3 BLOCKED (migrations 0006 & 0007 pending, local webhook secret unconfigured), 1 SKIPPED (live GHL delivery). Status: **PARTIAL PASS — RELEASE BLOCKED**.
- **Playwright Browser E2E:** 27 PASS, 1 SKIPPED (Chromium + Mobile Pixel 7).

## 5. Migration-Readiness Record (APPLY_0006_AND_0007.sql)
- **Target Database:** `https://yamwmfgqqjwlfcjjkwzl.supabase.co` (PostgreSQL 15+).
- **Current State:** Migrations 0001–0005 applied; `commercial_terms_versions` and base tables exist.
- **Rollout File:** `supabase/migrations/APPLY_0006_AND_0007.sql` (32.9 KB).
- **Transaction Safety:** Wrapped inside explicit `BEGIN ... COMMIT` block.
- **Idempotency:** Guarded with `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `DROP POLICY IF EXISTS`.
- **Fail-Closed Default:** Seeds `public.system_environment` with `('current', 'production', false)` so runtime strictly rejects synthetic transactions until explicitly toggled by super_admin in staging.
- **Permissions:** `ingest_leadconnector_event` restricted strictly to `service_role` (revoked from `public`, `anon`, `authenticated`).
- **Post-Application Verification:** Run `npm run audit:migrations` followed by `npm run verify:staging -- --allow-mutation` to observe migration audit checks transition immediately from `BLOCKED` to `PASS`.

## 6. Outstanding founder-only actions (Priority Order)
1. **Apply Migrations 0006 & 0007 in Supabase SQL Editor:** Paste and run `supabase/migrations/APPLY_0006_AND_0007.sql` in project `yamwmfgqqjwlfcjjkwzl`.
2. **Configure Vercel Environment Variables:** In Vercel Project Settings, set `LEADCONNECTOR_WEBHOOK_SECRET`, `RATE_LIMIT_SECRET`, and set `ENGINE_OS_ENV=staging` on Preview vs `ENGINE_OS_ENV=production` on Production.
3. **Promote Founder Super-Admin Account:** Run `node scripts/promote-founder-admin.mjs --email <founder-email>` once signed up.

## 7. Release posture
- **Release A (lead acquisition + quotation drafting):** Code fully implemented, hardened, and verified with fail-closed safety guards; **release approval pending** founder database execution, Vercel secrets configuration, and founder launch sign-off.
- **Release B (binding quote/order + client delivery):** Implemented and verified in non-binding staging mode; **held** for production legal/financial governance.
- **Release C (gateway payments + automated notifications):** Adapters exist; **intentionally disabled** by policy.
- **Permissions:** `ingest_leadconnector_event` restricted strictly to `service_role` (revoked from `public`, `anon`, `authenticated`).
- **Post-Application Verification:** Run `npm run audit:migrations` followed by `npm run verify:staging` to observe all migration audit checks transition immediately from `BLOCKED` to `PASS`.

## 6. Outstanding founder-only actions (Priority Order)
1. **Apply Migrations 0006 & 0007 in Supabase SQL Editor:** Paste and run `supabase/migrations/APPLY_0006_AND_0007.sql` in project `yamwmfgqqjwlfcjjkwzl`.
2. **Configure Vercel Environment Variables:** In Vercel Project Settings, set `LEADCONNECTOR_WEBHOOK_SECRET`, `RATE_LIMIT_SECRET`, and set `ENGINE_OS_ENV=staging` on Preview vs `ENGINE_OS_ENV=production` on Production.
3. **Promote Founder Super-Admin Account:** Run `node scripts/promote-founder-admin.mjs --email <founder-email>` once signed up.

## 7. Release posture
- **Release A (lead acquisition + quotation drafting):** Code fully implemented, tested, and polished; **release approval pending** founder database execution, Vercel secrets configuration, and founder launch sign-off.
- **Release B (binding quote/order + client delivery):** Implemented and verified in non-binding staging mode; **held** for production legal/financial governance.
- **Release C (gateway payments + automated notifications):** Adapters exist; **intentionally disabled** by policy.
