# Deployment and Operations Guide (V13.0)

## 1. Staging Infrastructure Status (`yamwmfgqqjwlfcjjkwzl`)

- **Supabase Cloud Project:** `https://yamwmfgqqjwlfcjjkwzl.supabase.co` (**DATABASE VERIFIED** & **STAGING E2E VERIFIED**)
- **Hosted Staging Application:** `https://notrealengine.vercel.app` (HTTP 200 OK)
- **GitHub Repository:** `https://github.com/bhaifreakinsazzad-ops/NotRealEngine` (Default branch: `main`, synchronized)
- **Database Schema:** All 30 canonical tables, 12 canonical services across 10 categories, RLS policies, state transition triggers, and private `project-files` storage bucket are live and verified by `npm.cmd run verify:staging` (**65/65 PASS**, **0 unexpected cleanup errors**).

---

## 2. Applying Migration `0006` in Supabase SQL Editor

Because PostgREST API keys (`anon` and `service_role`) do not grant superuser DDL execution over HTTP, paste and execute [`supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql`](../supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql) in the **Supabase Dashboard SQL Editor** for project `yamwmfgqqjwlfcjjkwzl`.

Migration `0006` applies the following critical governance features:
1. **`public.system_environment` Table & Function:** Defaults to `'production'` (fail-safe closed). Direct RPC `public.decide_quote` consults this table and rejects `staging_synthetic` terms whenever the environment is not `'staging'`.
2. **Founder Super-Admin Separation for Legal Terms:** Adds `public.current_user_is_super_admin()` and RPC `public.approve_commercial_terms(text, text, text)`. Ordinary staff are strictly blocked from promoting terms to `'approved_production'`.
3. **Upgraded Order Financial Clearance Guard:** Function `public.verify_order_financial_clearance()` on `public.orders` verifies currency and minor amount (`amount_minor >= total_minor AND currency = order.currency`), and rejects staging payment clearance methods (`staging_clearance`, `staging_test_clearance`, `synthetic_staging`) in production.
4. **Authoritative Atomic Project Provisioning RPC:** Function `public.initialize_project_from_order(uuid, uuid, text)` verifies financial clearance, ensures the service is canonical, and atomically creates project, requirements, milestones, outbox event, and audit log.

*(Note: If Migration `0005` was not run earlier, run `0005` first or run `supabase/bootstrap.sql` which includes all migrations through `0006`).*

---

## 3. Vercel Hosted Staging Configuration

The application is deployed on Vercel at `https://notrealengine.vercel.app`.

### Required Environment Variables (Preview & Production):
- `ENGINE_OS_ENV` = `staging` (for Staging / Preview) or `production` (for Production)
- `NEXT_PUBLIC_SUPABASE_URL` = `https://yamwmfgqqjwlfcjjkwzl.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<supabase-anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY` = `<supabase-service-role-key>` (**Server-Only / Sensitive**)
- `RATE_LIMIT_SECRET` = `<32-byte-hex-secret>` (**Server-Only / Sensitive**)
- `PAYMENTS_ENABLED` = `false`
- `NOTIFICATIONS_ENABLED` = `false`
- `PAYMENT_WEBHOOK_SECRET` = `<32-byte-secret>` (**Server-Only**)
- `CRON_SECRET` = `<32-byte-secret>` (**Server-Only**)

### Supabase Auth URL Configuration:
In Supabase Dashboard (`yamwmfgqqjwlfcjjkwzl`) -> **Authentication** -> **URL Configuration**:
- **Site URL:** `https://notrealengine.vercel.app`
- **Redirect URLs:**
  - `https://notrealengine.vercel.app/**`
  - `https://*.vercel.app/**`
  - `http://localhost:3000/**`

---

## 4. First Founder Super-Admin Account Promotion Procedure

Synthetic staging staff accounts are strictly scoped to staging. To promote the founder's verified Supabase Auth account without creating a public staff-registration surface:

### Option A — Via Direct Supabase SQL Editor (Recommended)
```sql
UPDATE public.profiles
SET is_staff = true,
    role = 'super_admin'
WHERE id = '<verified-founder-auth-user-uuid>';
```

### Option B — Via Local CLI Script (with Service Role Key)
```powershell
node scripts/promote-founder-admin.mjs --email <verified-founder-email>
# or
node scripts/promote-founder-admin.mjs --user-id <verified-founder-auth-user-uuid>
```
This sets `is_staff = true` and `role = 'super_admin'` on `public.profiles`. The user will immediately possess full access to `/admin` and the `approve_commercial_terms` RPC.
