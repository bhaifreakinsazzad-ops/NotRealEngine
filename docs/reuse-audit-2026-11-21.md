# NotRealEngine — Reuse-First Audit & Execution Plan (2026-11-21)

## Phase 0 Baseline Verification Log

- **Workspace**: `/app/applet` (Next.js 16.4.5, React 19.3.1, Tailwind CSS 4, Supabase SSR/JS, Vitest 4, Playwright 1.59). Note: `.git` directory is not present in the container workspace; edits are applied directly and safely in place.
- **`npm run typecheck`**: PASSED (`tsc --noEmit`).
- **`npm run lint`**: PASSED (`eslint .`).
- **`npm test`**: PASSED (16 test files, 154 tests).
- **`npm run audit:migrations`**: BLOCKED by missing external staging environment (`SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` not configured in local container).
- **Authoritative Sources Applied**:
  - `NRE_GitHub_Chief_Developer_Master_Prompt_2026-11-21.md`
  - `NRE_GitHub_Codebase_Audit_and_Execution_Readiness_2026-11-21.md`
  - `NRE_GitHub_Source_Reuse_Migration_Manifest_2026-11-21.json`
  - `NotRealEngine_Official_Master_Brand_Book_Premium_v2_2026-11-21.pdf`
  - `NotRealEngine_Official_Bangladesh_Bangla_Brand_Book_v1_2026-11-21.pdf`

## Reuse Matrix

| Feature | Exact Existing File(s) | Action | Reason | Risk / Guardrail |
| :--- | :--- | :--- | :--- | :--- |
| Canonical v5 Catalog (22 Services, 13 Add-ons, Compatibility, Legacy Aliases, PULSE Data) | `lib/catalog.ts` | **CREATE + ADAPT** (`lib/catalog-v5.ts` + adapt `lib/catalog.ts`) | Migrate from 12 `SVC-*` offers to authoritative v5 catalog while keeping clean compatibility helpers for historical records. | Never delete `SVC-*` aliases; keep `approvedForCheckout: false`; hide legacy BDT 999 promo publicly. |
| Database Schema & Seed Migration | `supabase/migrations/202611080001..0007.sql` | **KEEP + CREATE** (`202611210008_catalog_v5_pulse_and_office.sql`) | Migrations `0001`–`0007` are immutable historical migrations. Additive migration archives `SVC-*` (`active=false, canonical=false`), inserts 22 v5 services, adds add-ons, compatibility, PULSE plans/modules, project timeline events, and SI suggestions with RLS. | Preserve FK integrity on `project_briefs`, `packages`, `orders`, `projects`. |
| Project Brief & Draft Validation | `lib/validation/project-brief.ts`, `lib/validation/configuration-draft.ts`, `app/api/project-briefs/route.ts`, `app/api/drafts/route.ts` | **ADAPT** | Enforce v5 `serviceId` validity (reject retired `S16`/`S20`) and strict v5 service-to-add-on compatibility server-side. | Reject unknown/retired/incompatible add-ons with structured `400` validation errors. |
| Solution Finder Engine & UI | `lib/solution-finder.ts`, `components/solution-finder.tsx`, `app/solutions/page.tsx` | **ADAPT** | Map business goals to v5 services (`S01`–`S24`) with honest `Starting From ৳` context and guided quote fallback. | Keep deterministic, transparent recommendations without invented claims. |
| Official Brand System & Typography | `app/layout.tsx`, `app/globals.css`, `components/brand.tsx`, `components/site-header.tsx`, `components/site-footer.tsx` | **ADAPT** | Apply Official Brand Book v2 palette (`#05070C`, `#071524`, `#0E7BFF`, `#1DD8FF`, `#C7CED8`, `#2B3342`, `#F4F7FB`), `Inter` + `Noto Sans Bengali`, tabular numerals, original logo asset, and clean navigation. | Never recreate trademark logo as SVG lookalike; zero pink/purple/magenta. |
| Public Website & Service Discovery | `app/page.tsx`, `app/services/page.tsx`, `app/services/[slug]/page.tsx`, `app/pricing/page.tsx` | **ADAPT + CREATE** (`components/service-catalog-explorer.tsx`) | Present 22 services (13 Standalone + 9 Core Technical) with search/segment filtering, `Starting From` BDT pricing, scope caveats (`S12`, `S24`), compatible add-ons, and remove legacy BDT 999 promo & exaggerated 4K/60FPS claims. | Keep direct checkout disabled; show custom quotation CTA only. |
| Interactive Project Builder (6-Step) | `components/project-builder.tsx`, `app/build/page.tsx`, `app/build/review/page.tsx` | **ADAPT** | Support 22 v5 services, compatible add-ons with Starting From pricing, live blueprint summary, and free Markdown/JSON brief export before contact details while keeping existing opaque draft tokens. | Preserve `/api/drafts` & `/api/project-briefs` server-side workflows. |
| NRE OFFICE (Client & Admin Operations) | `app/dashboard/*`, `app/admin/*`, `app/admin/actions.ts`, `app/dashboard/actions.ts` | **ADAPT + CREATE** (`components/admin-support-controls.tsx`) | Resolve both v5 and legacy `SVC-*` labels cleanly, render evidence-backed milestone/event timelines (no fake percentages), add admin support ticket status updates, and display v5 catalog + legacy mapping in Admin Services/Pricing. | Preserve Supabase RLS, role guards (`requireAdmin`, `requireWorkspace`), and immutable quote acceptance RPC. |
| NRE LAB (Free Visitor Utility Suite) | `app/labs/page.tsx`, `components/engine-showcase.tsx` | **ADAPT + CREATE** (`lib/lab-tools.ts`, `app/api/lab/run/route.ts`, `components/nre-lab-workbench.tsx`) | Replace graphics-only `/labs` with free, no-login visitor tools (Scope & Add-On Estimator, Launch Readiness Checklist, Landing Page Blueprint, App vs PWA Guide) via Zod-validated, rate-limited server route with deterministic rules engine and export/Builder handoff. | Zero Puter login prompts, zero fake AI claims, rate-limited input handling. |
| NRE PULSE (Technical Care) | `app/pricing/page.tsx`, `app/dashboard/support/page.tsx` | **CREATE + ADAPT** (`app/pulse/page.tsx`) | Dedicated NRE PULSE page with FLEX / CORE / PRIME weekly Starting From + monthly Proposed (Owner Approval Pending) plans, 7 coverage modules (`M01`–`M07`), "Human-led · Expert-backed · AI-assisted" positioning, and clear boundaries. | Recurring billing OFF; clarify 24/7 = request submission & status tracking only. |
| Installable PWA | `app/layout.tsx`, `public/` | **CREATE** (`app/manifest.ts`, `public/sw.js`, `app/offline/page.tsx`, `components/pwa-controls.tsx`, PNG icons) | Enable standalone installability and safe offline fallback for public shell without ever caching authenticated or private routes. | Service worker strictly bypasses `/api/*`, `/dashboard/*`, `/admin/*`, `/login`, `/signup`, `/quotes/*`, `/orders/*`. |
