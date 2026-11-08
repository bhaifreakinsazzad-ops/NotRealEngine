# Release readiness — 2026-11-08

## COMPLETE (implemented and locally verifiable)

- Modular Next.js/Tailwind/TypeScript foundation and public route structure.
- Exact canonical registry and reconciled website scope.
- Rules-based finder, six-step builder UX, server validation, and secure-intake database contract.
- Authentication/server authorization foundation, workspace/admin route protection.
- Normalized schema, RLS policies, private file policies, state guards, price constraints, quote decision/order transaction, outbox/audit records.
- Unit and public browser test suites plus database policy-contract tests.

## BLOCKED (external dependency or approval)

- Actual PostgreSQL persistence and cross-browser admin visibility: requires a supplied Supabase project and applied migrations.
- Real authentication/email verification: requires Supabase project and approved mail configuration.
- Live payment collection/reconciliation: requires merchant eligibility, provider approval, credentials, webhook contract, and owner activation.
- Email/SMS/messaging delivery: requires approved providers, sender identities, credentials, and verified worker.
- Binding privacy/terms/refund text: requires owner/legal approval.
- Production monitoring, backup rehearsal, staging preview, and live-domain deployment: require external projects and deployment approval.

## INCOMPLETE (repository work still required)

- Opaque-token server draft persistence and PDF brief export.
- Admin mutation forms for quotation, package/price approval, project assignments, and support replies.
- Payment adapter implementation and webhook verification tests.
- Outbox worker and provider adapters.
- Full requirements/file upload/revision/approval UI mutations.
- Real-environment two-tenant isolation tests, accessibility audit, performance budget, monitoring integration, backup/restore drill.

## Decision

**HOLD production launch and live customer onboarding.** The repository is a production-oriented foundation and truthful working acquisition UI, not a completed live business. The next safe milestone is a configured staging Supabase project, applied migrations, seeded staff account, and end-to-end Journey A/B evidence before expanding operational mutations.

## Tooling advisory

`npm audit --omit=dev` reports zero production vulnerabilities. The full audit currently reports eight moderate development-only `minimatch` findings under `typescript-eslint`; npm's proposed forced remediation downgrades `eslint-config-next` across a breaking framework boundary. Track an upstream compatible update rather than forcing that downgrade.
