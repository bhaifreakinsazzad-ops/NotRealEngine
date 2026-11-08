# Verified Qwen prototype audit and migration map

Audited source: `C:\Users\sazza\OneDrive\Documents\ENGINE__OS · Digital engineering platform — NOTREAL ENGINE.html` on 2026-11-08.

## Evidence

- LeadConnector export: 961,211 bytes, 4,497 lines, duplicated outer platform wrapper plus an embedded second HTML application.
- Six script tags and seven style tags; the product implementation is a monolithic browser script.
- 48 `localStorage` references; no server `fetch()` boundary. The prototype itself labels persistence client-side only.
- Simulated session and record authorization are implemented in JavaScript; acceptance checks explicitly classify real authentication, private file authorization, payment callbacks, and cross-browser persistence as blocked or untestable.
- Useful domain assets exist: exact 10-category/12-offer registry, features/add-ons, Solution Finder rules, six-step builder, quote/order/project states, audit/outbox vocabulary, empty states, and the obsidian/cyan/gold design language.
- The embedded package registry records BDT 999 but keeps the package unorderable and regular price unresolved.

## Verified defects

| Prototype surface | Defect | Production replacement |
|---|---|---|
| Browser database | Any user can alter or erase business data; no cross-browser persistence | PostgreSQL schema, migrations, transactions, RLS |
| Session/roles | Client code can switch simulated role and organization | Supabase Auth, SSR session, server staff check, membership RLS |
| Authorization | JavaScript record filtering is not a security boundary | Organization policies and negative database tests |
| Intake | Local form limits and persistence are bypassable | Zod validation, HMAC fingerprint, DB rate bucket, narrow RPC |
| Pricing | Prototype evaluator is not authoritative | integer minor units, approval/date/market constraints, unique eligibility rule in domain tests |
| Quote acceptance | Browser transition cannot prove identity or immutability | transactional RPC, locked quote, snapshot, unique acceptance/order |
| Payments | No verified provider or idempotent webhook | disabled provider boundary plus unique provider event model |
| Files | Browser metadata cannot enforce access | private Storage bucket and project/org RLS |
| Notifications | Local outbox cannot deliver or retry reliably | durable outbox schema; channels remain disabled |
| Acceptance tests | Several checks prove only local implementation or are marked blocked | unit, browser, pgTAP, and required real-environment tests |

## Source-to-production migration

- CSS variables and UI patterns → `app/globals.css` and focused React components.
- Registry and add-on dependencies → `lib/catalog.ts` plus seeded database records.
- Finder rules → typed, deterministic `lib/solution-finder.ts` with complete-case tests and guided fallback.
- Builder → accessible React state machine plus server-validated intake. Reload persistence is intentionally not claimed until the opaque-token draft API is completed.
- State maps → domain tests plus database transition triggers.
- Local audit/outbox concepts → append-only audit and durable outbox tables.
- Simulated client/admin screens → protected SSR routes querying RLS-controlled tables.

The LeadConnector wrapper, duplicated documents, global event delegation, client-controlled roles, local business database, synthetic production records, and fake integration states were not migrated.
