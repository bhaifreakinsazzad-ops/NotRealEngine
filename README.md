# NOTREAL ENGINE — ENGINE//OS

Production-oriented Next.js and Supabase foundation for NOTREAL ENGINE's digital service commerce and business operations platform.

## What is implemented

- Public homepage, exact 10-category/12-offer service directory, service pages, auditable Solution Finder, pricing gate, and six-step Project Builder.
- Strict server validation and a rate-limited PostgreSQL intake RPC. When Supabase is absent, submission fails closed with an honest configuration error.
- Supabase SSR authentication routes, protected client workspace, server-authorized staff control center, and organization-scoped queries.
- Normalized PostgreSQL schema, RLS policies, private project-file bucket policies, state-transition triggers, immutable quote decisions, idempotent quote-to-order creation, outbox/audit models, and development seed data.
- Unit tests for registry integrity, pricing, state transitions, finder coverage, and brief validation; Playwright public/mobile smoke tests; pgTAP policy-contract checks.

## Local setup

1. Install Node.js 22+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and populate a non-production Supabase project.
3. Apply migrations with the Supabase CLI: `supabase db reset` for a disposable local project, or `supabase db push` only after reviewing the target.
4. Run `npm run dev` and open `http://localhost:3000`.

Without Supabase credentials, public pages and the client-side builder render, but authentication, server persistence, workspace/admin data, and submission remain unavailable by design.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright test
```

Database policies require a disposable Supabase test project and pgTAP. See `supabase/tests/rls_authorization.sql` and `docs/DEPLOYMENT.md`.

## Commercial and external gates

- Live payments: disabled; provider eligibility, merchant approval, credentials, signatures, and reconciliation are unresolved.
- Notifications: outbox foundation exists; external channels are disabled until providers are approved and verified.
- Legal documents: reserved draft routes only; no binding text is supplied.
- Production deployment: not performed.
- BDT 999 Single Page Website promotion: recorded as an unorderable reference; duration, complete package approval, regular price, and checkout readiness remain unresolved.

Read `docs/ARCHITECTURE.md`, `docs/PROTOTYPE_AUDIT.md`, `docs/SCOPE_RECONCILIATION.md`, and `docs/RELEASE_READINESS.md` before changing these gates.
