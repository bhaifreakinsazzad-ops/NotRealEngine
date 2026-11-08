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

---

## 2. LeadConnector (GoHighLevel) Inbound Webhook Adapter

ENGINE//OS provides a fully normalized, authenticated omnichannel webhook adapter at:
`POST /api/webhooks/leadconnector`

### Webhook Capabilities:
- Ingests **Calendar Bookings** (`Appointment`), **Onboarding Form Submissions** (`Form`), **Chat Widget Handoffs** (`ChatMessage`), and **Contact Inquiries**.
- Authenticates payloads via HMAC signature (`x-leadconnector-signature` / SHA256) or API token (`x-leadconnector-key` or `Authorization: Bearer <secret>`).
- Resolves Canonical Service IDs (`SVC-01-SPW` default).
- Enforces an automated **1-hour email deduplication window** to eliminate duplicate lead spam.
- Creates linked records in `public.project_briefs` and `public.leads` with attribution metadata and audit logging.

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

## 4. Applying Migration `0006` in Supabase SQL Editor

Because Supabase HTTP PostgREST API keys do not execute superuser DDL, execute [`supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql`](../supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql) in the **Supabase Dashboard SQL Editor** for project `yamwmfgqqjwlfcjjkwzl`.

### Migration `0006` Governance Enforcements:
1. **`public.system_environment` Table & RPC:** Defaults to `'production'` / `is_synthetic_allowed = false` (fails closed). Includes `public.set_system_environment(p_environment text, p_allow_synthetic boolean)` restricted exclusively to `super_admin`.
2. **Founder Super-Admin Commercial Terms Separation:** Adds `public.approve_commercial_terms(p_version text, p_reference text, p_notes text)`. Ordinary staff cannot promote terms to `'approved_production'`.
3. **Upgraded Order Financial Clearance Guard:** Enforces exact currency and integer minor amounts (`amount_minor >= total_minor AND currency = order.currency`). Rejects synthetic staging payments in production.
4. **Authoritative Atomic Project Provisioning RPC:** Function `public.initialize_project_from_order(uuid, uuid, text)` verifies financial clearance, ensures the service is canonical, and atomically creates project, requirements, milestones, outbox event, and audit log.

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
