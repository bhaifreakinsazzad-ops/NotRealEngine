# Deployment and Operations Guide (V12.0)

## 1. Staging Infrastructure Status (`yamwmfgqqjwlfcjjkwzl`)

- **Supabase Cloud Project:** `https://yamwmfgqqjwlfcjjkwzl.supabase.co` (**DATABASE VERIFIED** & **STAGING E2E VERIFIED**)
- **GitHub Repository:** `https://github.com/bhaifreakinsazzad-ops/NotRealEngine` (Default branch: `main`, synchronized)
- **Database Schema:** All 30 canonical tables, 12 canonical services across 10 categories, RLS policies, state transition triggers, and private `project-files` storage bucket are live and verified by `npm.cmd run verify:staging` (**62/62 PASS**, **0 unexpected cleanup errors**).

---

## 2. Applying Migration `0005` in Supabase SQL Editor

Because PostgREST API keys (`anon` and `service_role`) do not grant superuser DDL execution over HTTP, paste and run [`supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql`](../supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql) in the **Supabase Dashboard SQL Editor** for project `yamwmfgqqjwlfcjjkwzl`.

Migration `0005` hardens the database boundary to match the already-active Next.js server-action guards:
1. Revokes `EXECUTE` on `public.submit_project_brief(jsonb,text,text)` from `authenticated` (restricting execution strictly to `service_role`).
2. Creates `public.commercial_terms_versions` (`draft`, `staging_synthetic`, `approved_production`, `retired`) and enforces terms classification + `public.is_org_admin` inside `public.decide_quote`.
3. Attaches trigger `orders_financial_clearance_guard` (`public.verify_order_financial_clearance()`) on `public.orders`.
4. Creates atomic RPC `public.initialize_project_from_order` and adds `role` column on `public.profiles`.

---

## 3. Vercel Hosted Staging Deployment Procedure

Vercel CLI (`65.12.1`) is installed locally (`npx.cmd vercel`), and requires a one-time founder authentication or GitHub repo link:

### Option A — Deploy via Vercel Dashboard (Recommended)
1. Import `https://github.com/bhaifreakinsazzad-ops/NotRealEngine` (Branch: `main`).
2. Configure Environment Variables (Preview & Production):
   - `ENGINE_OS_ENV` = `staging` (for Preview/Staging) or `production` (for Production)
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://yamwmfgqqjwlfcjjkwzl.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<your-supabase-anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY` = `<your-supabase-service-role-key>` (**Server-Only / Sensitive**)
   - `RATE_LIMIT_SECRET` = `<random-32-byte-hex-secret>` (**Server-Only / Sensitive**)
   - `PAYMENTS_ENABLED` = `false`
   - `NOTIFICATIONS_ENABLED` = `false`
   - `PAYMENT_WEBHOOK_SECRET` = `<random-32-byte-secret>` (**Server-Only**)
   - `CRON_SECRET` = `<random-32-byte-secret>` (**Server-Only**)
3. In Supabase Dashboard (`yamwmfgqqjwlfcjjkwzl`) -> **Authentication** -> **URL Configuration**:
   - Set **Site URL** to your hosted Vercel URL.
   - Add `https://*.vercel.app/**` and `http://localhost:3000/**` to **Redirect URLs**.

### Option B — Deploy via Local Vercel CLI
```powershell
npx.cmd vercel login
npx.cmd vercel link
npx.cmd vercel deploy
```

---

## 4. First Founder Super-Admin Account Promotion (Section 8)

Synthetic staging staff accounts are automatically deleted after `npm.cmd run verify:staging`. To promote the founder's verified Supabase Auth account without any public staff-registration surface:

### Option A — Via CLI Script
```powershell
node scripts/promote-founder-admin.mjs --user-id <verified-founder-auth-user-uuid>
# or
node scripts/promote-founder-admin.mjs --email <verified-founder-email>
```

### Option B — Via Supabase SQL Editor
```sql
UPDATE public.profiles
SET is_staff = true,
    role = 'super_admin'
WHERE id = '<verified-founder-auth-user-uuid>';
```
