# Deployment and Operations Guide (V14.0)

## 1. Environment Topology Resolution & System Architecture

ENGINE//OS separates operational environments strictly to prevent development or staging artifacts from impacting live clients:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ENGINE//OS TOPOLOGY                                    │
├─────────────────────────────────────────┬──────────────────────────────────────────────┤
│ STAGING / PREVIEW TARGET                │ PRODUCTION TARGET                            │
├─────────────────────────────────────────┼──────────────────────────────────────────────┤
│ • Domains: notrealengine.vercel.app     │ • Domains: app.notrealengine.online          │
│ • Database: yamwmfgqqjwlfcjjkwzl        │ • Database: Dedicated Production Supabase    │
│ • Mode: ENGINE_OS_ENV=staging           │ • Mode: ENGINE_OS_ENV=production (DEFAULT)   │
│ • Synthetic Identities: Allowed         │ • Synthetic Identities: Strictly Rejected    │
│ • Non-binding Quotes: Allowed           │ • Non-binding Quotes: Blocked at DB trigger  │
│ • Staging Payment Clearance: Allowed    │ • Staging Payment Clearance: DB Exception    │
└─────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### Critical Environment Isolation Rules:
1. **Default Fail-Safe Mode:** If `ENGINE_OS_ENV` is unset or empty, the entire platform automatically defaults to `"production"`. In production mode, synthetic terms (`staging_synthetic`) and test clearance methods (`staging_clearance`) are strictly rejected by PostgreSQL triggers.
2. **Vercel Environment Scoping:**
   - On Vercel, assign `ENGINE_OS_ENV=staging` explicitly to **Preview** environments.
   - For **Production** deployments, assign `ENGINE_OS_ENV=production`.
3. **Dedicated Production Supabase Instance:**
   - The current Supabase instance `yamwmfgqqjwlfcjjkwzl` serves as the verified staging and integration cluster.
   - For final commercial release, create an independent production Supabase project and apply `supabase/bootstrap.sql` to instantiate clean tables and canonical catalogs.

### What "two domains on one Vercel project" actually means today (verify before relying on this):
As of the last independently verified inspection, `app.notrealengine.online` and
`notrealengine.vercel.app` were both aliases of the **same** Vercel project with its latest
deployment targeting **Production** — i.e. two domain names pointing at one deployment, not two
isolated environments. Two aliases of the same deployment share the same environment variables,
so assigning `ENGINE_OS_ENV=staging` "to Preview" only takes effect if Preview deployments are
actually a distinct target from what those domains serve. Founder action needed to get real
isolation (exact steps, to perform in the Vercel dashboard — this repo has no Vercel credentials
to do this from here):
1. In Vercel Project Settings → Environment Variables, confirm which of `ENGINE_OS_ENV`,
   `RATE_LIMIT_SECRET`, `LEADCONNECTOR_WEBHOOK_SECRET` exist and for which scope
   (Production / Preview / Development). Set each one explicitly per scope rather than relying
   on defaults — see `.env.example` for what each controls.
2. Decide which URL is the real staging target. Either keep a dedicated git branch (e.g.
   `staging`) permanently deployed as a Preview deployment with `ENGINE_OS_ENV=staging` scoped
   to Preview only, or provision a second Vercel project pointed at a second Supabase project for
   a fully separate staging stack. A second project is the stronger isolation (separate secrets,
   separate database, no risk of a Preview env var scoping mistake leaking into Production).
3. Never let `app.notrealengine.online` (the production domain) serve a deployment built with
   `ENGINE_OS_ENV=staging` or staging Supabase credentials.
4. Once the real staging URL is confirmed, hosted Playwright E2E can run against it with
   `PLAYWRIGHT_BASE_URL=https://<staging-url> npx playwright test` (see `playwright.config.ts`)
   instead of only ever testing a local `next start` — never point this at the production URL,
   since these tests include state-mutating flows (lead submission, quote acceptance).

---

## 2. LeadConnector (GoHighLevel) Inbound Webhook Adapter

ENGINE//OS provides a fully normalized, authenticated omnichannel webhook adapter at:
`POST /api/webhooks/leadconnector`

### Webhook Capabilities:
- Ingests **Calendar Bookings** (`Appointment`), **Onboarding Form Submissions** (`Form`), **Chat Widget Handoffs** (`ChatMessage`), and **Contact Inquiries**.
- Authenticates via a mandatory, fail-closed shared secret delivered only as a request header
  (`x-leadconnector-key`, `x-webhook-secret`, or `Authorization: Bearer <secret>`), compared in
  constant time. **This is not HMAC/payload-signature verification** — GoHighLevel's Workflow
  Webhook action does not sign its payloads, so there is no signature to verify; a prior version
  of this document incorrectly claimed one. If the integration is ever moved to a GHL Marketplace
  App webhook (which does sign via JWT in `x-wh-signature`), that would need its own verification
  path. The `?secret=` query-string auth path has been removed.
- If `LEADCONNECTOR_WEBHOOK_SECRET` is unset, every request is rejected — there is no
  environment-based bypass.
- Resolves a canonical Service ID **only** when the provider explicitly sends one and it's
  currently active in the catalog; it is never guessed or defaulted. An enquiry with no
  recognized service ID is stored with `service_id = NULL` for staff to qualify.
- Deduplicates by **event identity** (provider + a stable id for the specific appointment/form/
  contact event, enforced by a unique constraint on `public.webhook_events`), not by contact
  email within a time window — so a replayed delivery is always caught, and two distinct
  enquiries from the same person are never merged into one.
- Creates linked records in `public.project_briefs` and `public.leads`, plus the audit log entry,
  as one atomic transaction via `public.ingest_leadconnector_event` (migration `0007`) — not as
  separate inserts that could leave an orphaned brief if a later write failed.

### Required Environment Variable:
```bash
LEADCONNECTOR_WEBHOOK_SECRET="<your-generated-random-32-byte-hex-secret>"
```
Set this in the Vercel Project Settings and in the GoHighLevel / LeadConnector webhook settings under **Headers**:
`x-leadconnector-key: <your-generated-random-32-byte-hex-secret>`

---

## 3. Client Portal & DNS Routing Strategy

### Native Authoritative Workspace:
The authoritative client workspace for ENGINE//OS is hosted natively at:
`https://app.notrealengine.online/dashboard` (or `/dashboard` relative).
All primary "Portal", "Workspace", and "Client Area" buttons in the navigation header, footer, quick-connect panel, and homepage link directly to `/dashboard`. This guarantees immediate, authenticated access to projects, orders, requirements, and file deliverables without external dependencies.

### External GHL Portal DNS Requirement:
If the organization intends to route clients to the external GoHighLevel client portal at `clientportal.notrealengine.online`:
1. In your domain DNS manager (e.g., Cloudflare, Namecheap, AWS Route 53), add a **CNAME record**:
   - **Host / Name:** `clientportal`
   - **Target / Value:** `msgsndr.online` (or your designated LeadConnector CNAME destination)
   - **Proxy Status:** DNS Only / False (if using Cloudflare)
2. Until this DNS record is published and verified, do NOT point primary application buttons to `clientportal.notrealengine.online` to avoid `ENOTFOUND` browser errors.

---

## 4. Applying Migrations `0005`–`0007` in Supabase SQL Editor

Because Supabase HTTP PostgREST API keys do not execute superuser DDL, these must be run in the
**Supabase Dashboard SQL Editor** for project `yamwmfgqqjwlfcjjkwzl` — check which have already
been applied before re-running any of them (this repo cannot query that database directly to
confirm):
- [`supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql`](../supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql)
- [`supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql`](../supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql)
- [`supabase/migrations/202611080007_leadconnector_ingestion_integrity.sql`](../supabase/migrations/202611080007_leadconnector_ingestion_integrity.sql)

`supabase/bootstrap.sql` does **not** include any of these three — its own header says it
composes `0001`–`0004` only — so it cannot be used as a shortcut for them.

### Migration `0006` Governance Enforcements:
1. **`public.system_environment` Table & RPC:** Defaults to `'production'` / `is_synthetic_allowed = false` (fails closed). Includes `public.set_system_environment(p_environment text, p_allow_synthetic boolean)` restricted exclusively to `super_admin`.
2. **Founder Super-Admin Commercial Terms Separation:** Adds `public.approve_commercial_terms(p_version text, p_reference text, p_notes text)`. Ordinary staff cannot promote terms to `'approved_production'`.
3. **Upgraded Order Financial Clearance Guard:** Enforces exact currency and integer minor amounts (`amount_minor >= total_minor AND currency = order.currency`). Rejects synthetic staging payments in production.
4. **Authoritative Atomic Project Provisioning RPC:** Function `public.initialize_project_from_order(p_order_id uuid, p_service_id text, p_requirements jsonb, p_milestones jsonb)` verifies financial clearance, ensures the service is canonical, and atomically creates project, requirements, milestones, outbox event, and audit log.

### Migration `0007` Governance Enforcements:
1. **Unclassified Intake:** `public.project_briefs.service_id` is now nullable; an enquiry with no recognized canonical service is stored as unclassified rather than defaulted to one.
2. **Event-Identity Idempotency & Atomic Ingestion:** `public.ingest_leadconnector_event(...)` (service-role only) performs the webhook's idempotency check, project_brief insert, lead insert, and audit log as a single transaction, keyed on the unique `(provider, provider_event_id)` constraint already present on `public.webhook_events`.

---

## 5. First Founder Super-Admin Account Promotion Procedure

### Option A — Direct Supabase SQL Editor (Recommended)
```sql
UPDATE public.profiles
SET is_staff = true,
    role = 'super_admin'
WHERE id = '<verified-founder-auth-user-uuid>';
```

### Option B — Local CLI Script (with Service Role Key)
```powershell
node scripts/promote-founder-admin.mjs --email <verified-founder-email>
# or
node scripts/promote-founder-admin.mjs --user-id <verified-founder-auth-user-uuid>
```
