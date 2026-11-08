# ENGINE//OS repository instructions

- Treat `lib/catalog.ts` and migration seed `202611080002_seed_canonical_services.sql` as one canonical registry: exactly 10 categories and 12 offers. Web Application and PWA are distinct. Automation/integrations are capabilities, not core services.
- Do not activate checkout, payments, notifications, legal acceptance, or production deployment without explicit owner approval and verified provider configuration.
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
