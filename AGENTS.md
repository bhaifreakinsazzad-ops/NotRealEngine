# ENGINE//OS repository instructions

- Treat `lib/catalog-v5.ts`, `lib/catalog.ts`, and additive migration `202611210008_catalog_v5_pulse_and_office.sql` as one canonical v5 registry: exactly 22 active services (13 Standalone `S01`–`S13` + 9 Core Technical `S14, S15, S17, S18, S19, S21, S22, S23, S24`), 13 compatible add-ons (`A01, A02, A03, A06, A09, A10, A11, A13, A14, A15, A17, A18, A19`), 3 NRE PULSE plans (`PULSE_FLEX`, `PULSE_CORE`, `PULSE_PRIME`), and 7 PULSE coverage modules (`M01`–`M07`). Retired IDs (`S16`, `S20`, `A04`, `A05`, `A07`, `A08`, `A12`, `A16`, `A20`, `A21`) must never appear publicly. Web Application (`S08`) and PWA (`S09`) remain distinct. Preserve historical `SVC-*` identifiers via archival alias lookups without deleting historical rows.
- Public BDT launch prices are `Starting From` estimates only (`quote_required`); never expose the legacy BDT 999 campaign in public discovery. NRE PULSE monthly rates are proposed and require explicit founder approval before billing activation.
- Do not activate checkout, payments, recurring billing, notifications, legal acceptance, or production deployment without explicit owner approval and verified provider configuration.
- Never use browser storage as the production business database, accept client-supplied roles, expose the Supabase service-role key, or bypass RLS in client code.
- Commercial calculations use integer minor units. A checkout price must be active, orderable, approved, market-valid, effective, and unambiguous.
- Quote acceptance must go through the database RPC and preserve an immutable snapshot. Payment state may become `paid` only from a verified idempotent provider event.
- Keep legal pages visibly draft until approved text is supplied.
- Before handoff, run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and relevant Playwright/Supabase database tests. Report any missing external environment separately from code failures.
- Add migrations; do not edit an already-applied production migration. Test RLS with two distinct organizations before release.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
