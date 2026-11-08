# Deployment and operations

## Staging preparation

1. Create a dedicated Supabase staging project and a separate Vercel project.
2. Set the environment values from `.env.example`; keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Review then apply migrations in order. Run pgTAP and two-tenant manual negative tests.
4. Configure Supabase Auth redirect URLs for the staging domain.
5. Run build, unit, E2E, accessibility, and responsive checks.
6. Confirm payments and external notification flags remain false.

## Backup and recovery

- Enable Supabase point-in-time recovery appropriate to the production plan.
- Rehearse restoring a staging copy before launch.
- Export migration/version metadata with every release.
- Treat accepted snapshots, orders, payment transactions, project files, and audit logs as high-value records.

## Monitoring

`SENTRY_DSN` is reserved but not wired. Before production, add server/client error monitoring with secret and personal-data scrubbing, health checks, outbox backlog alerts, failed webhook alerts, and database/storage capacity monitoring.

## Rollback

Application rollback uses the previous verified Vercel deployment. Database changes require forward-compatible migrations and a documented corrective migration; never use destructive resets on shared environments.
