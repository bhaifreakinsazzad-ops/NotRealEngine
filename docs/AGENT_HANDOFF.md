# ENGINE//OS — Agent Handoff & Continuity Record
Updated: 2026-11-08 by Gemini Coding Agent (Directive V8.0 Handoff)

## 1. Executive Summary & Takeover Context
- **Product:** ENGINE//OS (NOTREAL ENGINE, LLC)
- **Active Lead Developer Agent:** Gemini Coding Agent
- **Preceding Developer:** OpenAI Codex (Historical Baseline Commit: `287ebd9`)
- **Git HEAD Commit:** `9fafc13` (Preceding hardening commit)
- **Current Working Branch:** `master`
- **Remote Origin URL:** `https://github.com/bhaifreakinsazzad-ops/NotRealEngine.git` (Fetched; `origin/main` has initial commit)
- **Target Supabase Staging URL:** `https://yamwmfgqqjwlfcjjkwzl.supabase.co` (Reachable, HTTP 401 PostgREST live)
- **Release Decision:** DEVELOPMENT VERIFIED — STAGING BLOCKED (Pending Supabase Staging Keys)

---

## 2. Core Architecture & Verification Evidence
- **Framework:** Next.js 16.4.5 (Turbopack, App Router) with React 19.3.1
- **Language / Typing:** TypeScript 5.7.2 (Strict mode enabled, `noEmit` verification: 0 errors)
- **Styling:** Tailwind CSS 4.3.5 with Obsidian / Metallic / Electric Cyan theme
- **Database & Identity:** Supabase SSR (`@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.119.0)
  - PostgreSQL 15+ engine with 24 RLS-governed tables
  - Migrations:
    - `202611080001_engine_os_foundation.sql` (Tables, RLS, RPCs, Storage bucket)
    - `202611080002_seed_canonical_services.sql` (10 categories, 12 services)
    - `202611080003_security_hardening.sql` (Authenticated brief submission, storage delete/update policies)
  - Trigger-enforced state transitions (`quote_state`, `order_state`, `project_state`)
  - Atomic database RPCs (`submit_project_brief`, `decide_quote` with `FOR UPDATE` row lock)
- **Test Metrics:**
  - **Unit Tests:** 50 tests across 10 test files (100% passing)
  - **E2E Playwright Tests:** 22 tests across Desktop Chromium and Mobile Pixel 7 (100% passing)
  - **Production Build:** 36 static, SSG, dynamic, and API routes cleanly compiled
  - **Staging Smoke Suite:** `npm run verify:staging` active (`scripts/verify-staging.mjs`, output: `docs/staging-report.json`)
  - **Security Audit:** 0 production vulnerabilities; 13 targeted tenant isolation & signature unit tests passing

---

## 3. Key Architecture & File Map
| Functional Area | Primary Path | Security & Architectural Invariants |
|---|---|---|
| Canonical Registry | `lib/catalog.ts` | Exactly 10 categories, 12 canonical services. Web App and PWA are distinct. |
| Commercial Engine | `lib/domain/quotes.ts` | Strict integer minor units. Immutable snapshot generated upon quote publishing and acceptance. |
| Quotation Interface | `app/quotes/[id]`, `app/quotes/actions.ts` | Calls atomic RPC `decide_quote`. Creates order idempotently upon acceptance. |
| Client Workspace | `app/dashboard/`, `app/dashboard/projects/` | Milestone progress bar, requirement desk, deliverable sign-offs, revision limits. |
| Secure File Storage | `components/project-file-uploader.tsx`, `app/dashboard/actions.ts` | 50MB max, MIME whitelist, storage path strictly `${projectId}/<file>`, traversal sequences rejected. |
| Admin Operations | `app/admin/` | Real-time operational queues: leads, quotes, orders, projects, pricing, support. |
| Payment Gateway | `lib/integrations/payments/`, `app/api/webhooks/payment/` | Constant-time HMAC-SHA256, Stripe tolerance check, SSLCommerz server-to-server Validation API. |
| Automation Worker | `lib/integrations/outbox-worker.ts`, `app/api/cron/outbox/` | Transactional outbox with atomic Compare-And-Swap (CAS) concurrency lock; bearer-token authenticated cron endpoint. |
| Staging Smoke Test | `scripts/verify-staging.mjs` | Automated smoke testing suite for live staging Supabase instance (`npm run verify:staging`). |

---

## 4. Documentation Suite
- `docs/STAGING_VERIFICATION.md` — Step-by-step guide for staging deployment and two-tenant verification.
- `docs/SECURITY_AUDIT.md` — Complete threat model, RLS audit, and storage hardening report.
- `docs/INTEGRATION_STATUS.md` — Payment gateway comparison, webhook protocols, and outbox runner.
- `docs/PRODUCTION_LAUNCH_CHECKLIST.md` — Pre-flight quality gates, launch checklist, and release phases.
- `docs/FOUNDER_APPROVALS.md` — Register of founder-controlled decisions and environment requirements.
- `docs/RELEASE_READINESS.md` — Up-to-date release readiness evaluation.
- `docs/IMPLEMENTATION_STATUS.md` — Truthful matrix of all 23 application areas.
- `docs/NEXT_ACTIONS.md` — Prioritized engineering backlog.
- `docs/staging-report.json` — Machine-readable staging smoke test output.

---

## 5. Commands to Run Verification
```bash
# Staging Smoke Verification (Connects to https://yamwmfgqqjwlfcjjkwzl.supabase.co)
npm.cmd run verify:staging

# Strict Typecheck
npm.cmd run typecheck

# ESLint
npm.cmd run lint

# Vitest Unit & Domain Test Suite (50 tests)
npm.cmd test

# Playwright E2E Test Suite (22 tests on Desktop Chromium & Mobile)
npm.cmd run test:e2e

# Production Build
npm.cmd run build
```
