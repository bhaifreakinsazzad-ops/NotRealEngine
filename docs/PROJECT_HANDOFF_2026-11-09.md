# ENGINE//OS — Project Status & Handoff
**Company:** NOTREAL ENGINE, LLC  
**Snapshot:** 2026-11-09 (Bangladesh time)  
**Status:** ACTIVE EXECUTION (Directive V19.0 — Critical Verification Safety & Release A Completion)  
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
  - **Eliminated Mutating RPC Migration Probes:** Removed dangerous calls (`approve_commercial_terms`, `set_system_environment`, `ingest_leadconnector_event`) from the verification script that could have accidentally promoted unapproved terms or flipped environment state.
  - **Read-Only Metadata & Schema Audit (`lib/staging/read-only-audit.ts` & `scripts/read-only-audit.mjs`):** Built 100% read-only PostgREST OpenAPI metadata inspection evaluating tables, columns, RPC parameter signatures, and pure `SELECT` queries without any state mutation.
  - **Semantic Payload Hashing for LeadConnector:** Implemented deterministic, key-sorted JSON canonicalization (`computeSemanticPayloadHash`) that filters transient transport metadata (e.g. `attempt`, `retryCount`), completely preventing false HTTP 409 Conflicts from webhook delivery retries or key reordering.
  - **Layered Verification Architecture:** Re-architected `verify:staging` into 4 distinct verification layers (Layer A: Read-Only Audit; Layer B: Controlled Database Fixtures with Staging Safeguards; Layer C: External Provider Status; Layer D: Hosted Browser Acceptance Guidance).
  - **Regression Test Suite:** Added 11 new automated regression tests (97/97 tests passing across 12 suites).

## 3. Current verified repository and deployment
| Area | Verified snapshot |
|---|---|
| GitHub main | **572c4501c16964449479dfd8d089b38185027ab9** (synced) |
| Active feature branch | `feature/v18-release-a-finalization` |
| Vercel project | **notrealengine** |
| Latest Vercel deployment | **dpl_E6btjEpgWVHD46qMcBjJLEP3WLW4** — READY, **production** target, commit f6e19d0 |
| Public aliases | https://app.notrealengine.online and https://notrealengine.vercel.app |
| Supabase staging project reference | **yamwmfgqqjwlfcjjkwzl** |
| Remote database migration status | **0001–0005 APPLIED & VERIFIED**; **0006 & 0007 READY in APPLY_0006_AND_0007.sql** |

## 4. Implementation and quality evidence
- **TypeScript Typecheck:** PASS (0 errors).
- **ESLint:** PASS (0 errors, 0 warnings; Next.js 16 Core Web Vitals & TypeScript rules).
- **Unit & Regression Suite:** PASS (97/97 Vitest tests across 12 test suites).
- **Next.js Production Build:** PASS (37/37 routes compiled).
- **Staging Verification Suite:** 65 PASS, 3 BLOCKED (truthful signal: blocked solely on unapplied 0006/0007 migrations and unconfigured local webhook secret), 1 SKIPPED (live GHL delivery).
- **Playwright Browser E2E:** 27 PASS, 1 SKIPPED (Chromium + Mobile Pixel 7).

## 5. Migration-Readiness Record (APPLY_0006_AND_0007.sql)
- **Target Database:** `https://yamwmfgqqjwlfcjjkwzl.supabase.co` (PostgreSQL 15+).
- **Current State:** Migrations 0001–0005 applied; `commercial_terms_versions` and base tables exist.
- **Rollout File:** `supabase/migrations/APPLY_0006_AND_0007.sql` (32.9 KB).
- **Transaction Safety:** Wrapped inside explicit `BEGIN ... COMMIT` block.
- **Idempotency:** Guarded with `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `DROP POLICY IF EXISTS`.
- **Fail-Closed Default:** Seeds `public.system_environment` with `('current', 'production', false)` so runtime strictly rejects synthetic transactions until explicitly toggled by super_admin in staging.
- **Permissions:** `ingest_leadconnector_event` restricted strictly to `service_role` (revoked from `public`, `anon`, `authenticated`).
- **Post-Application Verification:** Run `npm run verify:staging` to observe all migration audit checks transition immediately from `BLOCKED` to `PASS`.

## 6. Outstanding founder-only actions (Priority Order)
1. **Apply Migrations 0006 & 0007 in Supabase SQL Editor:** Paste and run `supabase/migrations/APPLY_0006_AND_0007.sql` in project `yamwmfgqqjwlfcjjkwzl`.
2. **Configure Vercel Environment Variables:** In Vercel Project Settings, set `LEADCONNECTOR_WEBHOOK_SECRET`, `RATE_LIMIT_SECRET`, and set `ENGINE_OS_ENV=staging` on Preview vs `ENGINE_OS_ENV=production` on Production.
3. **Promote Founder Super-Admin Account:** Run `node scripts/promote-founder-admin.mjs --email <founder-email>` once signed up.

## 7. Release posture
- **Release A (lead acquisition + quotation drafting):** Code fully implemented, tested, and polished; **release approval pending** founder database execution, Vercel secrets configuration, and founder launch sign-off.
- **Release B (binding quote/order + client delivery):** Implemented and verified in non-binding staging mode; **held** for production legal/financial governance.
- **Release C (gateway payments + automated notifications):** Adapters exist; **intentionally disabled** by policy.
