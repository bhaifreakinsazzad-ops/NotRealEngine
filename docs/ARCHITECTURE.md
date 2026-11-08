# ENGINE//OS architecture

## Decision

ENGINE//OS is a modular Next.js App Router application backed by Supabase PostgreSQL, Auth, RLS, and private Storage. The browser renders workflows and submits validated commands; it is never the authority for identity, organization membership, commercial state, payment state, or project transitions.

## Five engines

1. **Discover:** public routes, canonical registry, service pages, deterministic Solution Finder.
2. **Build:** six-step configuration, dependency/conflict handling, validated server intake.
3. **Commerce:** versioned packages/prices, quotes, immutable acceptance snapshot, idempotent orders, payment-provider boundary.
4. **Client:** authenticated organization workspace, projects, requirements, files, approvals, revisions, invoices, support.
5. **Operations:** staff-only leads, quotes, orders, projects, registry/pricing, payments, support, audit and release gates.

## Trust boundaries

- Supabase Auth provides verified identity. `proxy.ts` refreshes server sessions.
- Server routes validate input with Zod. The anonymous brief endpoint calls one narrow database function and cannot read business records.
- RLS is the tenant boundary. App filtering is only presentation.
- `profiles.is_staff` is read by the server under RLS; there is no client role switch.
- Quote/order/project state changes are guarded again by PostgreSQL triggers.
- Quote acceptance is a transaction: lock sent quote, check ownership and expiry, store immutable snapshot, change state, create exactly one order, enqueue one event, append audit evidence.
- Private project files use a non-public bucket; the first path segment is the project UUID and policies resolve project organization membership.

## Reliability

Outbox and notification rows contain idempotency keys, attempts, availability, failure, and disabled states. External delivery is deliberately disabled. Provider workers may be added later without placing external I/O inside order/project transactions.

## Environment separation

Use separate Supabase and Vercel projects for development, staging, and production. Never reuse service-role keys. Production migrations, provider activation, and live-domain deployment require explicit approval.
