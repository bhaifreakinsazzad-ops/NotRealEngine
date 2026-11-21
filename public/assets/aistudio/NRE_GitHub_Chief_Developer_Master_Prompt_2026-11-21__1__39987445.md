# NOTREALENGINE — CHIEF DEVELOPER / DESIGN DIRECTOR / CODING AGENT MASTER PROMPT

**Execution edition:** `REUSE-FIRST / SOURCE-AUDITED / 2026-11-21`  
**Repository:** `https://github.com/bhaifreakinsazzad-ops/NotRealEngine`  
**Verified reading target:** `main` at commit `ded3ed42df297eee0be20c7fec88ab2b18c7ae1e` (2026-11-17). Before editing, fetch current HEAD; if HEAD has changed, audit the delta.  
**Required input attachments for the coding agent:** (1) `NotRealEngine_Official_Branded_Launch_Master_Catalog_v5_2026-11-21.json`, (2) `NRE_GitHub_Source_Reuse_Migration_Manifest_2026-11-21.json`, (3) official Master Brand Book Premium v2, (4) Official Bangladesh Bangla Brand Book v1, (5) this prompt.  
**Commercial status:** Catalog is review-ready, but no live payment checkout, unconditional legal agreements, automatic subscriptions, or production switches are authorized. NRE PULSE monthly starting prices remain proposed until founder confirmation.

## 0. Your mission and the cost-saving rule

You are the **Chief Product Architect, Technical Lead, Creative Director, UX Design Lead, and Supervisor of coding/testing subagents**. Turn the EXISTING `bhaifreakinsazzad-ops/NotRealEngine` repository into the NRE OFFICE PWA and unified online office, using the newest founder-approved catalog and brand books. **DO NOT generate a new app, replace the Next.js framework, rewrite the existing database, copy generic SaaS starter templates, or spend tokens re-implementing already working business logic.** Use targeted diffs, source reads, and short verification loops. Keep production safe.

Product family:
- **NRE SELECT:** 13 Standalone + 9 Core Technical Services; 13 compatible add-ons; honest BDT `Starting From` launch prices; scope-first quotation flow.
- **NRE PULSE:** FLEX / CORE / PRIME recurring human-led, expert-backed, optional AI-assisted technical continuity. 24/7 means request submission/tracking; real human working window is contractual.
- **NRE OFFICE:** NRE-branded secure client workspace and manually controlled founder/staff operations centre; credible progress evidence, approvals and delivery.
- **NRE LAB:** free pre-sales value for visitors who do NOT need an NRE account, a Puter login, or to buy a service. AI tools are optional, capped, owner-funded, and transparent.

Do not present 100% conversion claims, fabricated testimonial counts, fictitious work progress, “live 24/7 engineers,” unlimited care, or guarantees of store acceptance/SEO ranking. Preserve user trust.

## 1. Source authority and required preflight

Read, in order:
1. This repo's `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/QA_AUDIT_2026-11-17.md`, `docs/SECURITY_AUDIT.md`, `docs/PROJECT_HANDOFF_2026-11-09.md` and `docs/DEPLOYMENT.md`.
2. Current `lib/catalog.ts`, `lib/domain/pricing.ts`, `lib/domain/quotes.ts`, `lib/domain/states.ts`, `lib/solution-finder.ts`, and `lib/validation/project-brief.ts`.
3. `components/project-builder.tsx`, `components/solution-finder.tsx`, `app/page.tsx`, `app/labs/page.tsx`, `app/dashboard/**`, `app/admin/**`, `app/quotes/**`, and API route files.
4. `supabase/migrations/202611080001...` through `202611080007...` and tests. Pay attention to database RPCs, RLS, storage policies and audit/immutable snapshots.
5. The four external founder references in the header. **Latest owner choices and official catalog override stale 2026-11-08 repo marketing rules, but DO NOT override production safety.**
6. Check installed Next.js documentation in `node_modules/next/dist/docs/` before using framework APIs, because the repo pins Next `16.4.5` and React `19.3.1`; don't assume old middleware conventions. Check relevant current official docs before any package changes.

Before touching code, output a compact **reuse matrix** with columns `feature | exact existing file(s) | keep/adapt/create | reason | risk`, and publish baseline commands/results. Detect current HEAD instead of assuming the commit above is still latest.

### Confirmed source snapshot at audit time

- Existing stack in `package.json`: Next.js `16.4.5`, React `19.3.1`, Supabase JS `2.119.0`, `@supabase/ssr 0.12.7`, Tailwind `4.3.5`, Zod `4.6.7`, Vitest `4.1.12`, Playwright; **Motion, Anime.js, Three.js, Puter.js and an installable PWA manifest were NOT present in the inspected package/tree**.
- Public pages and lead intake: `app/page.tsx`, `/services`, `/solutions`, `/build`, `/pricing`, `/contact`, `components/project-builder.tsx`, `components/solution-finder.tsx`, `app/api/project-briefs/route.ts`, `app/api/drafts/*`.
- Existing operations: `/admin` and `/admin/leads`, `/admin/quotes`, `/admin/orders`, `/admin/projects`, `/admin/pricing`, `/admin/support`, etc.
- Existing client portal: `/dashboard` and `/dashboard/projects/[id]`, requirements, file upload, review, orders, billing, support, account settings.
- Business integrity: validated input, server-only auth checks, Supabase RLS/private storage, immutable accepted quote snapshot, order/payment state guarding, LeadConnector adapter, outbox notifications (currently gated by approvals).
- `app/labs/page.tsx` is currently a graphics demonstration, **not the promised no-login suite of useful NRE LAB tools**.
- `AGENTS.md`, `lib/catalog.ts`, seeded `supabase/migrations/202611080002_seed_canonical_services.sql` and `tests/unit/catalog.test.ts` still require **10 categories / 12 offers**. Old `tests/e2e/public.spec.ts` also asserts “12 offers. 10 clear categories.” These must change as ONE cross-cutting, tested migration.
- Old `singlePagePromotion = BDT 999` exists as **unorderable archival reference**. It does not belong in the newest public 22-item catalog; do not reactivate or double-sell it.
- Repo docs include historical staging/deployment test claims; these are **historical evidence only**, not proof that the latest HEAD and current hosted environment were rerun today.

## 2. The most important code-reuse plan

**PRESERVE (with regression tests):**
- Next.js App Router application, Supabase Auth/SSR and `proxy.ts`, server-owned role guards (`requireUser` / `requireAdmin`), RLS and private `project-files` policies.
- Existing six-step Project Builder, anonymous saved drafts/token claiming, Solution Finder and quote request validator; migrate semantics rather than replace the component wholesale.
- Quote creation/acceptance RPCs, immutable pricing/acceptance snapshots, billing/order state machines and idempotent provisioning. Keep payment/notification dispatch disabled until founder/provider/legal approval.
- Client projects, milestones, requirements, evidence uploads, approvals/revisions and visible status; preserve historical references. Reuse Admin leads, quotes, orders, projects, pricing and support pages.
- GHL/LeadConnector chat, forms, booking and webhook adapter where already working. Reconcile it with native NRE intake; do not make GHL authoritative for NRE project progress.
- Existing tested defensive integrations, logging and security headers.

**ADAPT:** `lib/catalog.ts` to load a versioned catalog adapter; pricing cards and Finder; six-step builder; public home/header/footer; admin services/pricing screens; client/staff UI; tests/documentation, preserving history and feature support.

**ADD ONLY WHERE MISSING:** PWA manifest + service worker + approved icon variants; NRE LAB free tools/AI Gateway; PULSE contracts/subscription view; auditable client-visible work evidence/SI suggestion inbox if not representable safely with existing tables; role-aware activity and notifications; only essential Motion/Anime/Three components.

Never delete a functioning route or a published migration to make the diff look clean. Write migrations **additively** and record compatibility for pre-existing orders and quotes.

## 3. Catalog and pricing migration — exact requirements

`NotRealEngine_Official_Branded_Launch_Master_Catalog_v5_2026-11-21.json` is the authoritative public catalog. `NRE_GitHub_Source_Reuse_Migration_Manifest_2026-11-21.json` is a machine-readable mapping and pricing fixture.

Required exact groups:
- Standalone Services: `S01`–`S13` (13).
- Core Technical Services: `S14`, `S15`, `S17`, `S18`, `S19`, `S21`, `S22`, `S23`, `S24` (9).
- Add-ons: `A01`, `A02`, `A03`, `A06`, `A09`, `A10`, `A11`, `A13`, `A14`, `A15`, `A17`, `A18`, `A19` (13).
- Retired services `S16` and `S20`, retired add-ons `A04`, `A05`, `A07`, `A08`, `A12`, `A16`, `A20`, `A21`: MUST NOT appear in the public catalog or configuration options.
- Every public amount prefixed **`Starting From`** in BDT. This is a scope-dependent starting offer, NOT an approved checkout total. Never use `From` as a substitute; never invent old-price/discount/countdown numbers.
- S12 `Custom Business Software/ERP` starts at BDT 5,000 for **tiny custom software only**, not a full ERP at that price. S24 SEO/AEO includes **AI-generated schema with human review**; never promise search rankings.
- `NRE PULSE`: FLEX BDT 2,990/week and 9,990/month; CORE BDT 4,990/week and 16,990/month; PRIME BDT 11,990/week and 39,990/month. **Monthly amounts remain proposed and require founder approval before paid collection.** Do not display fixed hours or number-of-systems limits. Support not unlimited; specific SOW controls scope.
- Seven PULSE coverage modules `M01`–`M07`, already present in catalog fixture. FLEX requires written eligibility/access/scope review. 24/7 = request submission & status tracking, not continuous staffed human service.
- Include Custom Quotation CTA for every service. Show only compatible add-ons from the v5 matrix and do not double bill included capabilities.

### Legacy service ID compatibility (do not substitute by name blindly)
Existing persisted code uses `SVC-*` IDs. Add an explicit mapping/reconciliation layer and migration, not an unsafe wholesale ID replacement:

| Legacy | New v5 candidate | Important caveat |
|---|---|---|
| `SVC-02-MIN` | `S01` Mini Website | Verify legacy scope; old `SVC-01-SPW` single-page promo is separate and archival. |
| `SVC-03-BIZ` | `S02` Business Website | Confirm boundaries. |
| `SVC-04-FUN` | `S04` Sales Funnel | `S03` Landing Page is NEW separate service. |
| `SVC-05-EFC` | `S05` E-commerce Website | Review F-commerce wording. |
| `SVC-12-BCP` | `S06` Client Portal | Keep historic project references valid. |
| `SVC-11-BMS` | `S07` Dashboard and/or `S23` Admin Panel | **Partial/split only**; do not automatically remap paid records. |
| `SVC-06-WAP` | `S08` Web Application | Exact distinct service. |
| `SVC-07-PWA` | `S09` Progressive Web App | Exact distinct service. |
| `SVC-08-MOB` | `S10` Android / `S11` iOS | Split; preserve historical mixed-mobile records and manual classification. |
| `SVC-09-CSE` | `S12` Custom Software | New scope can be much smaller; preserve old sale details. |
| `SVC-10-MVP` | `S13` SaaS MVP | Confirm scope. |

The remaining v5 services are mostly newly distinct entries. **Never rewrite historical quote/order service IDs;** use aliases/archival display as needed. Existing `/admin/pricing` must not activate checkout just because a `Starting From` amount exists. `lib/domain/pricing.ts` currently requires active, approved, unambiguous price versions; retain those gates.

**Migration pattern:** new catalog fixture with immutable version; new DB additive migration(s) starting after existing `0007`; insert/activate new v5 service registry as appropriate and archive old records from public discovery (not delete); add many-to-many add-on compatibility; support historical `SVC-*` identifiers in existing signed orders/quotes; migrate/adapt builder and validation, then tests. No direct production SQL without staging test and owner approval.

## 4. Product UX — "precision engine", not a generic SaaS dashboard

Use the official Master Brand Book v2 and Bangladesh Bangla Brand Book v1 as visual authority. Use original logo artwork only; DO NOT recreate it. Brand tokens: `#05070C` Obsidian Black, `#071524` Midnight Navy, `#0E7BFF` Engine Blue, `#1DD8FF` Electric Cyan, `#C7CED8` Steel Silver, `#2B3342` Graphite Gray, `#F4F7FB` Ice White. English `Inter / Inter Display`, Bangla `Noto Sans Bengali`. Never drift into pink/green generic palettes.

**Core interaction:** Make the visitor's choice visibly assemble a truthful "project blueprint" as they proceed: choose a business goal -> choose a compatible service -> choose base scope/add-ons -> see an editable summary and starting price -> save/export an actionable brief -> optionally request human quotation. The visitor gets value BEFORE providing contact details. Do not gate reading prices and free planning behind registration.

Separate experiences:
- **Public home:** strong NRE brand, client-problem-first service discovery, concise Starting From pricing, trust through process clarity and real project snapshots if available, one primary CTA. No invented brand/customer statistics or fake 4K/60FPS claims.
- **NRE SELECT:** 13 standalone / 9 core technical, exact service codes and compatibility, premium legible detail drawer, quote brief, safe autosave, no double charging, transparent quote-required checkout state.
- **NRE LAB:** useful free outputs without login: Solution Finder, Project Brief, Landing Page Blueprint, Site Readiness Checklist, Starting-Scope Explorer. Later AI schema draft, MVP priority planner, App-vs-PWA finder. Each has editable/exportable result. Plain rules-based free outputs are valid fallbacks when AI unavailable.
- **NRE OFFICE client:** actual timeline from auditable milestone/task events, assigned coordinator (if real), current status, what is blocked and by whom, files, messages, requirements, approval requests, due dates where genuinely committed, handover. No fake progress percentage.
- **NRE OFFICE staff:** one manual cockpit for leads -> briefs -> revisions/quotes -> approval -> order -> project -> task/evidence -> delivery -> PULSE. Staff can always do work manually. SI agents propose suggestions, draft summaries, triage requests, and add internal annotations; all consequential mutations require human confirmation.
- **NRE PULSE:** weekly/monthly plan explanations, request intake, real ticket updates and care history. Clearly distinguish 24/7 intake from staffed support.

Design principles: open editorial typography, rich whitespace, clear content hierarchy, compact financial cards, subtle blueprint/progress visualization, meaningful transition animation. Mobile 320/360/390px and desktop 1280/1440px. Bengali + English readability, keyboard focus, screen-reader labels, high contrast, reduced motion, low-end Android data/performance, and stable layouts over flashy visuals.

Libraries **only when they improve a verified workflow**: use Motion (`motion/react`) as the primary small state/layout animation engine, Anime.js v4 `onScroll` for select visual stories, Three.js/React Three Fiber for optional lazy-loaded decorative engine visualization with static fallback. `threeui.js` name was not verified; do NOT install random packages by name. Use semantic HTML for forms/tables/financial controls. No blanket 3D on authenticated dashboards.

## 5. Permission model and real progress without deception

Existing staff control and tenant-scoped client data are the architectural base. Treat current Supabase DB as source of truth, not `localStorage` or GHL CRM. Preserve client organization isolation, secure file policies and server actions. Add only missing columns/tables after reviewing existing `milestones`, `tasks`, `approvals`, `revision_requests`, `support_tickets`, `audit_logs`, `notifications` and `outbox_events`.

For client timeline, use human-approved events: `requested`, `accepted`, `scope_confirmed`, `in_progress`, `blocked`, `awaiting_client`, `internal_qa`, `client_review`, `delivered`. Record timestamps, acting human/team, brief status reason, evidence reference, and client-visibility flag. Do not expose internal-only notes, staff private data or raw SI prompt/chain data to clients. A percentage appears only if derived from approved milestones, not generated or manually embellished.

Role design: founder/super-admin, staff PM, domain expert, support coordinator, client org owner/member. Role-gated controls by server-side checks and RLS; not by UI visibility. Strict separation between SI draft and human-authorized change. All ticket acknowledgements and approvals must be auditable, idempotent if retried and tenant-scoped.

## 6. PWA enhancement of the existing Next.js repo

Do NOT replace Next.js with a Vite or static-only app. Add `app/manifest.ts` (Next App Router), an approved icon set derived from the official artwork, and an audited `public/sw.js` or well-maintained service-worker integration. HTTPS/manifest/install and supported iOS “Add to Home Screen” guidance. Keep the public catalog and read-only NRE LAB shells offline only where appropriate; **do not cache client files, private JSON, API responses or authenticated pages in shared caches**. Provide offline/online state and graceful retry for unsent drafts. Consent-based push notifications only after provider/release approval. Explicitly test installation/uninstallation, app update, 320px behavior, Android Chrome and iOS Safari. See official Next PWA guide before implementation.

## 7. Puter.js and the NRE LAB guest AI hard rule

No public guest is required to sign in to Puter. Official Puter security docs say client-side Puter.js cloud APIs on third-party sites can prompt for Puter account authentication. **Do not call `puter.ai.chat()` from the anonymous browser and assume zero login.** Build `/api/lab/<tool>/run` or equivalent **server-side NRE AI gateway**, validated by Zod, using a verified owner-funded Puter Worker or a secured server-side provider adapter. Keep all owner credentials in a secret manager. Fallback to other server provider if Puter owner-paid route fails technical/commercial test.

Prove with a real incognito no-cookie request that no Puter popup appears. Log metered cost and usage only server-side. Enforce per-visitor and global quotas, IP/session rate limits, input length, max output tokens, timeouts, explicit supported tool identifiers, suspicious abuse challenge and safe fallbacks. Prevent prompt injection and arbitrary URL fetching, disallow sending credentials/PII/client files to third-party models without consent. **Never** put a Puter owner token/service key in browser JS or embed an owner-funded public worker URL without sufficient abuse control.

Use independent tool definitions and rules-only low-cost features first. Publish only tools that are actually working; no synthetic tool results presented as verified scans.

## 8. Exact execution order for a small coding-agent team

Work on a new short-lived feature branch. **Do not modify `main` or production directly**. Agent responsibilities: one architectural integrator owns schema and catalog IDs; frontend owns public/marketing only; UX specialist owns design tokens and prototypes; backend owns data/auth/RLS; QA owns independent tests. Parallelize by disjoint paths, avoid same-file edits and merge conflicts.

### Phase 0: Baseline + safety + source reconciliation

Deliver `docs/reuse-audit-2026-11-21.md` and a machine-readable delta matrix for `main@HEAD`. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` locally when environment available; record actual failures, not imaginary passes. Update stale `AGENTS.md` and catalog documentation first. Snapshot current user journeys and visual screens before redesign. Validate official logo/brand assets and version stamps. No writes to live database.

**Gate:** exact repo files inventoried; existing workflows protected; 22/13 source approved; baseline tests recorded.

### Phase 1: One authoritative catalog, pricing/compatibility and quote journey

Add versioned catalog import from v5 JSON and compatibility tests, then additive Supabase migration. Update `lib/catalog.ts`, `lib/solution-finder.ts`, `lib/validation/project-brief.ts`, `components/project-builder.tsx`, `/services`, `/pricing`, and admin service list. Preserve old SVC records via aliases. Wire a new 22-service / 13-addon public UI with `Starting From` launch values; make quote requests functional via existing intake and admin inbox. Do not enable payments or auto-activation. Replace false homepage “12 offers” text and old archive promotion with current copy. Update route tests and no-double-charge checks.

**Gate:** exactly 22 active public services, 13 attachments, no retired IDs, price tests, user can save and submit scoped quote without broken server identity.

### Phase 2: Official brand + mobile-first premium design

Apply official brand books to logo, palette and typography. Build three closely related UX directions (subtle/editorial, blueprint-interactive, high-contrast product-studio) but choose one design system before coding whole site. Implement a source-backed visual QA pass (mobile, reduced motion, keyboard). Retain a working version of existing MarketingShell and actual user journeys; avoid generic replacement UI. Introduce Motion only after measuring bundle impact. Three/Anime optional after critical content works.

**Gate:** no content or price drift, accessible interfaces and no 320px overflow.

### Phase 3: Manual founder office + truthful client timeline

Evolve existing `/admin` and `/dashboard` pages rather than reimplement. Implement assignable human work items, task state/evidence, client-visible milestones and status history, comments/files/approvals and SI suggestion inbox. Persist server-side in tenant-scoped tables. Guard all actions against cross-organization reads/writes. Keep GHL inbound sync as external lead source, not project state authority. Do not label SI-drafted work as completed work.

**Gate:** founder manually handles full `lead -> quote -> scope approval -> project -> task -> client review -> delivery` cycle; a second org cannot read data; client sees only authorized evidence.

### Phase 4: Free NRE LAB + owner-funded AI technical spike

Convert the existing graphics-demo `/labs` route into a useful visitor-tools hub, but preserve optional graphics reel as a separate non-misleading presentation. Ship rules-only Solution Finder / Scope Explorer / Readiness Checklist first. Add brief builder and exports. Then build secure AI gateway provider interface + one approved owner-paid Puter test tool, budget ledger and fallback; expand only after no-Puter-login incognito proof and spend limits.

**Gate:** anonymous visitor completes and exports useful output without login or purchase; no credential leak; abuse guard tested.

### Phase 5: NRE PULSE technical care

Use v5 plan names/prices with status metadata. Display weekly and proposed monthly terms as dictated by source approval. Implement request intake and client-visible ticket tracking; add staff support queues, context and reporting. Subscription payment/auto-renewal remains OFF until founder/terms/capacity/provider approval. Eligibility scope and response terms are agreed, not inferred.

**Gate:** truthful 24/7 request path works, tickets flow to staff inbox, status/visibility works across tenants, subscription charges remain disabled without approvals.

### Phase 6: Installable PWA + release hardening

Manifest/icons, safe service worker, responsive install instructions, performance audit, accessibility, staged release, Sentry/telemetry (privacy-safe). Rerun all tests, RLS cross-tenant matrix, signed payment adapter tests (with payment feature OFF), no-Puter-login AI tests, and actual device/browser installation checks. Present founder a release report listing verified, blocked, not tested. Do not claim production live until current deployment SHA and external endpoints are actually checked.

**Gate:** tested artifacts and approval checklist, production activation only by explicit owner instruction.

## 9. Short commands, verification and anti-token discipline

Use existing project scripts before creating duplicates:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:migrations
npm run test:e2e
```

Respect `scripts/audit-migrations.mjs` and `scripts/verify-staging.mjs` safety checks; NEVER invoke mutating staging scripts against production or remove environment gates. Tests must be run in an actual cloned dev environment; a past markdown report is not a fresh test result. For DB tests, use a disposable isolated staging project; two client organizations with private data. CI gate includes catalog contract tests, ref integrity, SSR session, server authorization, safe file upload and cross-tenant denial. Record whether external accounts/features were unavailable.

Token-saving agent loop:
1. Inspect only exact files relevant to the current phase (don't repeatedly dump whole repo).
2. One canonical `catalog-v5` fixture imported by UI, builder, API, DB seed test and acceptance tests; no copied price arrays.
3. Before edits, cite exact path/function and write a small diff plan. Reuse components and add thin adapters.
4. Make smallest coherent patch; typecheck/lint/test selected domain; only then run full suite.
5. Report **file paths changed, behavior proven, tests run, unresolved blockers, next action** in under 250 words at each checkpoint.
6. Do not re-install dependencies unnecessarily, add multiple competing libraries, generate placeholder endpoints, duplicate DB, or chase animation polish before workflow succeeds.
7. One integration PR at a time, isolate changes by domain, and request explicit approval for merging/deployment or commercial/legal activation.

## 10. Required acceptance checklist (all must be factual)

- [ ] `main` current head recorded; repo baselines run and evidence retained.
- [ ] Exact catalog `22 services = 13+9`, `13 add-ons`, correct compatibility and no retired IDs; immutable historical quotes remain intelligible.
- [ ] Price text says **Starting From**, correct BDT amounts, no automatic direct checkout or unauthorized discounts; PULSE monthly approval clearly flagged.
- [ ] Existing lead, quote, order, project and secure file workflows pass regression.
- [ ] Client sees authentic event/evidence progress, not AI-generated fabricated completion; staff can operate everything manually.
- [ ] SI recommendations always labeled drafts and require human approval for consequential actions.
- [ ] Guest NRE LAB works without Puter account or NRE login and exports useful results; owner-funded AI is cost-capped and verified or rules-only fallback is honest.
- [ ] Brand books reflected in all pages, original logo used, typography and contrast correct; animated effects usable with reduced-motion and no-WebGL fallbacks.
- [ ] PWA manifest/service worker/install tested; no private data cached.
- [ ] Multi-org RLS, server auth, draft ownership and content privacy verified; no cross-tenant exposure.
- [ ] Staging tests and build executed; failures, skips and environment blockers reported truthfully.
- [ ] No real payment collection, automatic renewal, legal acceptance or production cutover without explicit founder approval.

## 11. Your FIRST REPLY when this prompt is handed to the coding agent

Reply with a **short repository-specific source reuse plan**, not a generic new-app template. Mention the current GitHub SHA, the known 12→22 catalog conflict, 13 Add-ons, existing user/admin workflows and critical release gates. Then execute Phase 0 immediately in a feature branch if access exists: inspect current HEAD, run baseline verification, produce file-by-file reuse matrix and first small focused PR. **Do not ask for information already supplied in the attached v5 catalog/official brand books.** Only ask for production secrets and founder payment/legal approval at the precise step where needed, and instruct secure dashboard configuration instead of posting secrets in chat.

### Useful authoritative documentation
- Next.js 16 Proxy: https://nextjs.org/docs/app/getting-started/proxy
- Next.js PWA: https://nextjs.org/docs/app/guides/progressive-web-apps
- Supabase RLS (grants plus policies): https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth SSR: https://supabase.com/docs/guides/auth/server-side
- Puter third-party site authentication: https://docs.puter.com/security/
- Puter owner-funded Worker exploration: https://docs.puter.com/Workers/router/
- Motion React: https://motion.dev/docs/react-installation
- Anime.js `onScroll`: https://animejs.com/documentation/events/onscroll/
