# NotRealEngine — GitHub Codebase Review & Reuse-First Execution Readiness

**Audited:** 21 November 2026 | **Repo:** https://github.com/bhaifreakinsazzad-ops/NotRealEngine | **Branch:** main | **Observed HEAD:** `ded3ed42df297eee0be20c7fec88ab2b18c7ae1e` (last GitHub commit observed November 17, 2026).

**Verdict: KEEP AND UPGRADE THE EXISTING APPLICATION.** GitHub connector দিয়ে সরাসরি Repository Tree, কোডের মূল ফাইল, Documentation, Versioned Migrations, Tests ও সাম্প্রতিক commits পরীক্ষা করা হয়েছে। এটি নতুন Blank App নয়। তবে সম্পূর্ণ Code Execution/Build/Staging DB Verification এই অডিটে হয়নি; এখানে GitHub host থেকে local clone করার Network/DNS অনুপলব্ধ ছিল। সব Release QA-কে codebase-এর পুরোনো QA evidence ও এখনকার Audit findings হিসেবে আলাদা করতে হবে। কোনো Repo বা Production Environment পরিবর্তন করা হয়নি।

## ১. ইতিমধ্যে যা আছে এবং Reuse করতে হবে

| Existing asset | Repo evidence | সিদ্ধান্ত |
|---|---|---|
| Next.js 16.4.5 + React 19.3.1 + Tailwind 4 | `package.json`, `app/`, `app/globals.css` | Keep |
| Public services, homepage, finder, six-step builder | `app/page.tsx`, `lib/catalog.ts`, `components/project-builder.tsx`, `components/solution-finder.tsx` | Adapt |
| Anonymous saved draft, backend lead intake | `app/api/drafts/route.ts`, `app/api/project-briefs/route.ts` | Keep + adapt catalog IDs |
| Client Dashboard, project requirements/files/review | `app/dashboard/**`, `app/dashboard/actions.ts` | Keep + enhance timeline |
| Manual Staff/Admin Panel | `app/admin/**` incl. quotes, orders, support, pricing | Keep + enhance cockpit |
| Business-critical quote/order safeguards | `lib/domain/*`, `app/admin/orders/actions.ts`, DB RPC migrations | Do not rewrite |
| Tenant security and private files | `lib/auth.ts`, `lib/supabase/*`, `supabase/migrations/*` | Keep + RLS regression tests |
| LeadConnector hooks | `app/api/webhooks/leadconnector/route.ts`, `components/booking-calendar.tsx`, `components/onboarding-form.tsx`, `components/chat-widget.tsx` | Keep, confirm configuration |
| Existing unit/browser and migration audit tests | `tests/unit/*`, `tests/e2e/*`, `scripts/audit-migrations.mjs` | Extend and rerun |

## ২. Source-vs-target সবচেয়ে বড় পরিবর্তন

| Problem | Confirmed current repo | Current official target | Implementation |
|---|---|---|---|
| Old canonical registry | 10 Categories / 12 Services in `lib/catalog.ts` and 0002 seed | 13 Standalone + 9 Core = **22 Services**, 13 compatible Add-ons | Versioned v5 registry and additive DB migration |
| Old client price journey | Quote required; old BDT 999 promotion archived and disabled | Limited-Time Launch **Starting From** prices | Present real starting values but keep checkout gated |
| Old service IDs | `SVC-*` values persisted in quotes/orders | `S01..S24` excluding S16/S20 | Alias/compatibility; never rewrite historical paid records |
| Old tests/docs | `AGENTS.md`, catalog and Playwright tests assert 12 offers | v5 catalog and new group structure | Update together; no false green builds |
| Old marketing /labs | Graphics demonstration | Free useful NRE LAB tools without Puter account | Rework page and add guarded server AI gateway |
| PWA | No manifest/service worker found in repository tree | Installable mobile-first PWA | Add manifest/icon/service worker with safe cache rules |
| Animation libs | No Motion, Anime, Three or Puter SDK in dependencies | Premium but useful interactive UX | Introduce selectively, performance-tested |
| Staff and project progress | Working admin/client route base | Evidence-backed work stages and SI draft assistance | Extend manually controlled workflow, do not fake completion |
| Subscription | Existing support tickets but no v5 PULSE offer setup identified | Three PULSE plans, seven coverage modules | Add scoped data/UX with approval gates |

## ৩. Commercial source of truth (Official v5)

- Public items: **22 services, 13 add-ons; retired S16/S20 and A04/A05/A07/A08/A12/A16/A20/A21 excluded.**
- All prices: **Starting From**, BDT, customization-dependent, quote first. **Do not equate a starting price with a binding fixed checkout price.**
- NRE PULSE weekly founder-directed: **FLEX 2,990**, **CORE 4,990**, **PRIME 11,990** BDT.
- NRE PULSE monthly previously suggested, founder approval pending: **FLEX 9,990**, **CORE 16,990**, **PRIME 39,990** BDT.
- Never show fixed numbers of support hours or systems. Service isn't unlimited; written scope applies. **24/7** means requests/status tracking, not guaranteed human response.
- No fake legacy discount or expiry countdown. S12 BDT 5,000 describes tiny custom software scope, not a full ERP.

## ৪. Actual phased execution (small focused PRs)

| Phase | Task | Completion evidence |
|---|---|---|
| **0. Source lock** | read current HEAD; keep baseline tests; update stale AGENTS docs; migrate catalog specs | reuse matrix, baseline logs, no production mutation |
| **1. Catalog parity** | 22/13 v5 canonical registry, starting prices, compatibility, quote flow | tests for all items and IDs, no obsolete public labels |
| **2. Premium UX** | brand colors/real logo, Finder + Builder progressive disclosure, mobile legibility | snapshots/a11y/mobile QA, reduced motion |
| **3. Office** | reuse `/admin` and `/dashboard`, task evidence and human/SI approval states | manual end-to-end and cross-tenant denial tests |
| **4. NRE LAB** | rules-only free tools; owner-billed Puter/AI gateway proof; export | incognito no-Puter-login test, provider quotas, costs |
| **5. NRE PULSE** | contract-scoped tickets, plans, live history | honest 24/7 intake, no unapproved payments |
| **6. PWA + release** | manifest, offline-safe cache, install UX, full tests | device checks, performance/security verification, owner gate |

## ৫. Token এবং development cost control

- **Reuse existing 263-entry repo tree** and existing production-focused application. No blanket scaffold or wholesale rewrite.
- Use exact file-focused reads, not repeated full-repo dumps. Group work by backend/catalog, frontend/design, operations, QA with one integrator.
- **Single canonical v5 JSON** generates service data, UI display, add-on matrix and tests. No duplicate price arrays in multiple pages.
- Small, independently verifiable PRs with tests and file lists; lockfile unchanged unless a needed library is explicitly added.
- Minimal dependencies: CSS first, Motion for React transitions, Anime.js for selective scroll narrative, optional lazy Three scene; `threeui.js` not verified. Never introduce 3D to forms and dashboards.
- Database changes additively after existing 0007; preserve historical quotes, immutable order snapshots, tenant access and release flags.

## ৬. Important findings and launch gates

- Latest `docs/QA_AUDIT_2026-11-17.md` reports **154 unit tests passing at prior run**, plus prior successful typecheck/lint/build; those are **reported historical results**, not fresh execution by this audit.
- Latest QA doc says environment-level integration/production configuration still has withheld or unverified secrets, and cross-tenant live tests need separate isolated credentials. Production readiness remains a **verification and founder sign-off decision**.
- Existing `docs/PROJECT_HANDOFF_2026-11-09.md` reports staging/remote DB activation, but `docs/NEXT_ACTIONS.md` contains older migration instructions. **Do not blindly reapply previously applied production migrations.** Check migration history and environment first.
- Next.js 16 uses `proxy.ts` for request interception, **not a substitute for server authorization**. Keep existing action checks and RLS.
- New Supabase API-exposure defaults may require explicit grants/exposure for newly created tables. Confirm against current Supabase security docs and changelog before migration.
- Puter browser SDK on a third-party site may require Puter account authentication. The no-login guest requirement needs a real owner-funded server-side integration spike, rate limiting and cost validation.
- “100% accurate / production ready” cannot truthfully be claimed until fresh code tests, DB staging, live provider and mobile/PWA checks pass.

## ৭. Final Readiness

**READY TO START CODING ON A SAFE FEATURE BRANCH.** Repository structure, reuse candidates, conflicts, source-of-truth catalog, design direction, migration plan, phase gates and coding-agent master prompt are prepared. **NOT YET DONE:** latest main checkout, fresh CI build, applied v5 migrations, deployed UI, Puter owner billing test, production go-live.

**Coding-agent starting command:** Attach this report, official brand books, v5 catalog JSON, migration manifest and `NRE_GitHub_Chief_Developer_Master_Prompt_2026-11-21.md`. Instruct: **“Start Phase 0 on a feature branch. Reuse this repository. Do not deploy or modify production.”**

### Primary repo citations / evidence
- Repo: https://github.com/bhaifreakinsazzad-ops/NotRealEngine
- Main catalog: https://github.com/bhaifreakinsazzad-ops/NotRealEngine/blob/main/lib/catalog.ts
- Old instructions: https://github.com/bhaifreakinsazzad-ops/NotRealEngine/blob/main/AGENTS.md
- Latest QA: https://github.com/bhaifreakinsazzad-ops/NotRealEngine/blob/main/docs/QA_AUDIT_2026-11-17.md
- Existing DB: https://github.com/bhaifreakinsazzad-ops/NotRealEngine/tree/main/supabase/migrations
- App routes: https://github.com/bhaifreakinsazzad-ops/NotRealEngine/tree/main/app

### Official technical documentation
- https://nextjs.org/docs/app/getting-started/proxy
- https://nextjs.org/docs/app/guides/progressive-web-apps
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/changelog?types=breaking-change
- https://docs.puter.com/security/
- https://motion.dev/docs/react-installation
