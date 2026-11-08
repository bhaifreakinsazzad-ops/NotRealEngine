# ENGINE//OS — Agent Handoff & Continuity Record
Updated: 2026-11-08 by Gemini Coding Agent

## 1. Executive Summary & Takeover Context
- **Product:** ENGINE//OS (NOTREAL ENGINE, LLC)
- **Takeover Date:** 2026-11-08
- **Active Lead Developer Agent:** Gemini Coding Agent (Autonomous Engineering Takeover)
- **Preceding Developer:** OpenAI Codex (Historical Baseline Commit: `287ebd9`)
- **Current HEAD Commit:** `287ebd9` (with uncommitted verified implementation batches M4–M8 ready for staging commit)
- **Current Working Branch:** `master`
- **Repository Location:** `E:\Agentic Work Station\Web Applications\NotRealEngine`
- **Execution Mode:** Continuous, autonomous, repository-aware, verified incremental batches

---

## 2. Core Architecture
- **Framework:** Next.js 16.4.5 (Turbopack, App Router) with React 19.3.1
- **Language / Typing:** TypeScript 5.7.2 (Strict mode enabled, `noEmit` verification)
- **Styling:** Tailwind CSS 4.3.5 (@tailwindcss/postcss) with Obsidian / Metallic / Electric Cyan theme
- **Database & Identity:** Supabase SSR (`@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.119.0)
  - PostgreSQL 15+ engine
  - Strict Row Level Security (RLS) on all 24 public tables
  - Trigger-enforced state transitions (`quote_state`, `order_state`, `project_state`)
  - Immutable decision and audit logs
  - Rate-limited server-side lead ingestion RPC
- **Session & Routing:** `proxy.ts` (Next.js 16 middleware replacement) handles SSR session refresh; `lib/auth.ts` handles server-side route guards (`requireUser`, `requireAdmin`).

---

## 3. Verification Suite Results (All Passing)
- **Typecheck (`npm.cmd run typecheck`):** PASSED (0 errors)
- **Lint (`npm.cmd run lint`):** PASSED (0 errors, 0 warnings)
- **Unit Tests (`npm.cmd test`):** PASSED (36 tests across 9 test files)
  - `tests/unit/catalog.test.ts`
  - `tests/unit/solution-finder.test.ts`
  - `tests/unit/project-brief.test.ts`
  - `tests/unit/quotes.test.ts`
  - `tests/unit/orders.test.ts`
  - `tests/unit/states.test.ts`
  - `tests/unit/pricing.test.ts`
  - `tests/unit/payments.test.ts`
  - `tests/unit/outbox.test.ts`
- **E2E Playwright Tests (`npm.cmd run test:e2e`):** PASSED (22 tests passed across Chromium & Mobile)
  - `tests/e2e/public.spec.ts` (discovery, overflow, fail-closed builder)
  - `tests/e2e/flows.spec.ts` (legal draft enforcement, transparent pricing, service directory, solution finder, fail-closed auth guards)
- **Production Build (`npm.cmd run build`):** PASSED (35 static, SSG, dynamic, and API routes compiled)
- **Dependency Audit (`npm.cmd audit --omit=dev`):** PASSED (0 production vulnerabilities)

---

## 4. Key Repository Locations
| Area | Path | Responsibility |
|---|---|---|
| Service Catalog | `lib/catalog.ts` | 10 categories, 12 canonical services single source of truth |
| Domain Models | `lib/domain/` | State transitions (`states.ts`), pricing logic (`pricing.ts`), quotes (`quotes.ts`) |
| Intake Validation | `lib/validation/` | Zod schemas for briefs (`project-brief.ts`) |
| Supabase SSR | `lib/supabase/` | Server and client Supabase factories, config checks |
| Auth & RBAC | `lib/auth.ts`, `proxy.ts` | Staff verification, auth redirect guards |
| Migrations | `supabase/migrations/` | Schema, RLS, storage policies, RPCs |
| Public Routes | `app/`, `app/services/`, `app/solutions/`, `app/build/`, `app/pricing/` | Homepage, directory, finder, builder, pricing |
| Legal Routes | `app/privacy/`, `app/terms/`, `app/refund-policy/` | Visibly draft legal pages |
| Client Portal | `app/dashboard/`, `app/quotes/`, `app/orders/` | Customer workspace, quote review/acceptance, orders |
| Admin Center | `app/admin/` | Operations center (leads, quotes, orders, projects, clients, pricing, support) |
| Integrations | `lib/integrations/`, `app/api/webhooks/`, `app/api/drafts/` | Outbox worker, payment adapter, pre-registration drafts |

---

## 5. Milestone Progress Matrix
- [x] **M0: Repository Foundation & Verification Baseline** (COMPLETE)
- [x] **M1: Discovery Engine & Canonical Service Registry** (COMPLETE)
- [x] **M2: Solution Finder & Interactive Project Builder** (COMPLETE)
- [x] **M3: Lead Validation & Rate-Limited Database Intake** (COMPLETE)
- [x] **M4: Commerce & Quotation Engine** (COMPLETE)
- [x] **M5: Client Workspace & Project Operations** (COMPLETE)
- [x] **M6: Admin Operations Center** (COMPLETE)
- [x] **M7: Automation, Outbox & Integration Adapters** (COMPLETE)
- [x] **M8: Testing, Security Hardening & Release Verification** (COMPLETE)

---

## 6. External Governance Controls & Approvals Held
- **Live Payments:** Provider eligibility, merchant gateway keys, and live billing activation require explicit owner approval. Payment state may become `paid` only via verified idempotent provider webhooks.
- **Transactional Notifications:** Real provider SMTP/SMS delivery remains disabled; durable outbox records are enqueued safely without blocking business operations.
- **Legal Terms:** Legal and policy documents remain visibly marked as DRAFT until final executed copies are provided.
- **Production Deployment:** Live domain publishing and production migration execution remain founder-controlled.

---

## 7. Commands to Verify Repository
```bash
# Typecheck
npm.cmd run typecheck

# Linting
npm.cmd run lint

# Vitest Unit Tests (36 tests)
npm.cmd test

# Playwright E2E Tests (22 tests across Chromium & Mobile)
npm.cmd run test:e2e

# Next.js Production Build
npm.cmd run build
```
