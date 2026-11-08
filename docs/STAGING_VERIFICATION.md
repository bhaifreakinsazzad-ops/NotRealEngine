# ENGINE//OS — Staging Verification Guide & Environment Protocol
Version: 1.0 · Date: 2026-11-08 · Author: Gemini Coding Agent

---

## 1. Executive Environment Assessment

| Component | Target Requirement | Current Staging Availability | Verification Status |
|---|---|---|---|
| **Hosting Engine** | Node.js 20+ / Vercel / Cloudflare / Docker | Local Windows Host (Node v20.14.0) | LOCALLY VERIFIED |
| **Database Engine** | PostgreSQL 15+ (Supabase Managed) | Unconfigured (Credentials Pending) | BLOCKED (NEEDS SUPABASE) |
| **Auth Provider** | Supabase GoTrue Auth SSR | Unconfigured (URL/Keys Pending) | BLOCKED (NEEDS SUPABASE) |
| **File Storage** | Supabase Storage (`project-files`) | Unconfigured | BLOCKED (NEEDS SUPABASE) |
| **Payment Gateway** | SSLCommerz / Stripe / bKash / Nagad | Adapters Implemented; Live Gated | BLOCKED (NEEDS CREDENTIALS) |
| **Transactional Email** | Postmark / Resend / SendGrid | Outbox Implemented; Delivery Gated | BLOCKED (NEEDS CREDENTIALS) |

> [!IMPORTANT]
> The current development host lacks local Docker, local `psql`, and remote Supabase project credentials. In strict accordance with **Rule 5 (No False Production Claims)**, staging database verification is explicitly documented as **BLOCKED pending external staging infrastructure provisioning**.

---

## 2. Step-by-Step Staging Setup Procedure

When the founder supplies staging Supabase credentials, execute the following steps in sequence:

### Step 1: Populate Staging Environment Configuration
Create `.env.staging` (or `.env.local` for local staging preview):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=https://staging.notrealengine.online
PAYMENTS_ENABLED=false
NOTIFICATIONS_ENABLED=false
PAYMENT_WEBHOOK_SECRET=staging_webhook_secret_min_32_chars
CRON_SECRET=staging_cron_worker_secret_min_32_chars
SENTRY_DSN=
```

### Step 2: Apply Database Migrations
Connect to the staging Supabase project via Supabase CLI or PostgreSQL connection string:
```bash
# Option A: Via Supabase CLI (if CLI and Docker available)
supabase link --project-ref <your-project-ref>
supabase db push

# Option B: Via direct psql connection string
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/202611080001_engine_os_foundation.sql
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/202611080002_seed_canonical_services.sql
```

### Step 3: Verify Migration Integrity & Schema Assets
Run the verification query on the staging database:
```sql
-- 1. Verify all 24 public tables exist
SELECT count(*) FROM information_schema.tables 
WHERE table_schema = 'public'; -- Expect >= 24

-- 2. Verify canonical seed: 10 categories, 12 services
SELECT count(*) FROM public.service_categories; -- Expect 10
SELECT count(*) FROM public.services;           -- Expect 12

-- 3. Verify critical RPC functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('submit_project_brief', 'decide_quote'); -- Expect 2 rows

-- 4. Verify storage bucket creation
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'project-files'; -- Expect 1 row (public = false, limit = 52428800)
```

### Step 4: Seed Staging Staff & Multi-Tenant Test Identities
Create isolated synthetic user accounts in Supabase Auth:
```sql
-- Identify your staff user UUID from auth.users:
UPDATE public.profiles 
SET is_staff = true, full_name = 'Staging Operations Staff' 
WHERE id = '<STAFF-USER-UUID>';

-- Create Organization A (Customer A):
INSERT INTO public.organizations (id, name, slug) 
VALUES ('a0000000-0000-4000-8000-000000000001', 'Acme Corp Staging', 'acme-staging');

INSERT INTO public.organization_memberships (organization_id, user_id, role)
VALUES ('a0000000-0000-4000-8000-000000000001', '<CUSTOMER-A-UUID>', 'owner');

-- Create Organization B (Customer B):
INSERT INTO public.organizations (id, name, slug) 
VALUES ('b0000000-0000-4000-8000-000000000002', 'Beta Tech Staging', 'beta-staging');

INSERT INTO public.organization_memberships (organization_id, user_id, role)
VALUES ('b0000000-0000-4000-8000-000000000002', '<CUSTOMER-B-UUID>', 'owner');
```

---

## 3. End-to-End Business Flow Staging Verification Checklist

Once staging is live, verify the core user journey across two browser sessions:

### Journey 1: Customer A — Brief to Quote Acceptance
1. **Public Intake:** Open `/build` in Chrome Browser A. Complete 6-step project builder for "Business Dashboard & Order Management System".
2. **Database Verification:** Verify record appears in `project_briefs` and `leads` in the PostgreSQL database.
3. **Staff Triage:** Open `/admin/leads` in Firefox Browser B (logged in as Staff).
4. **Quotation Creation:** Click "Create Quote" -> build line items in minor integer units -> click "Publish Quote".
5. **Customer Decision:** Customer A navigates to `/quotes/<id>` -> clicks "Accept Quote".
6. **Integrity Check:** Verify:
   - Atomic RPC `decide_quote` executed.
   - Quote state changed to `accepted`.
   - Immutable snapshot copied to `quote_acceptances` and `orders`.
   - Customer redirected to `/orders/<order_id>`.

### Journey 2: Customer B — Multi-Tenant Isolation
1. **Direct Access Attempt:** Customer B attempts to view `https://staging.notrealengine.online/quotes/<Customer-A-Quote-ID>`.
2. **Expected Result:** Database RLS policy blocks access -> Page returns 404 / Quote not found.
3. **File Access Attempt:** Customer B attempts to download Customer A's private attachment.
4. **Expected Result:** Supabase storage policy `project_files_storage_select` evaluates `is_org_member` to false -> Access denied (403).

---

## 4. Rollback and Disaster Recovery Protocol

If an issue occurs during staging deployment:
1. **Application Rollback:** Revert deployment in hosting dashboard (or `git checkout 85e1dc8`).
2. **Database Restore:** Restore from the pre-migration snapshot created before migration execution.
3. **Logging & Diagnostics:** Review Supabase logs (`supabase/logs`) and Next.js server logs for any uncaught runtime exceptions.
