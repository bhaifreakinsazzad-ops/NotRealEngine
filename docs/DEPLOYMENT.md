# Deployment and Operations Guide (V11.0)

## 1. Staging Infrastructure Status (`yamwmfgqqjwlfcjjkwzl`)

- **Supabase Cloud Project:** `https://yamwmfgqqjwlfcjjkwzl.supabase.co` (**DATABASE VERIFIED** & **STAGING E2E VERIFIED**)
- **GitHub Repository:** `https://github.com/bhaifreakinsazzad-ops/NotRealEngine` (Default branch: `main`, synchronized)
- **Database Schema:** All 30 canonical tables, 12 canonical services across 10 categories, RLS policies, state transition triggers, and private `project-files` storage bucket are live and verified by `npm.cmd run verify:staging` (**58/58 PASS**).

---

## 2. Vercel Staging Preview & Release A Deployment Procedure

Because external Vercel account authentication is managed by the founder, connect the synchronized GitHub repository (`bhaifreakinsazzad-ops/NotRealEngine`) in Vercel using the following exact settings:

1. **Import Git Repository:**
   - Select `bhaifreakinsazzad-ops/NotRealEngine` (Branch: `main`).
   - Framework Preset: **Next.js**.
   - Build Command: `npm run build`
   - Output Directory: `.next`
2. **Environment Variables (Set in Vercel Project Settings -> Environment Variables):**
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://yamwmfgqqjwlfcjjkwzl.supabase.co` (Public)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<your-supabase-anon-key>` (Public)
   - `SUPABASE_SERVICE_ROLE_KEY` = `<your-supabase-service-role-key>` (**Server-Only / Sensitive**)
   - `RATE_LIMIT_SECRET` = `<random-32-byte-hex-secret>` (**Server-Only / Sensitive**)
   - `PAYMENTS_ENABLED` = `false` (Keep `false` for Release A)
   - `NOTIFICATIONS_ENABLED` = `false` (Keep `false` for Release A)
   - `PAYMENT_WEBHOOK_SECRET` = `<random-32-byte-secret>` (**Server-Only**)
   - `CRON_SECRET` = `<random-32-byte-secret>` (**Server-Only**)
3. **Supabase Auth URL Configuration:**
   - In Supabase Dashboard (`yamwmfgqqjwlfcjjkwzl`) -> **Authentication** -> **URL Configuration**:
     - Set **Site URL** to your Vercel deployment URL (e.g. `https://not-real-engine.vercel.app` or custom staging domain).
     - Add `https://*.vercel.app/**` and `http://localhost:3000/**` to **Redirect URLs**.

---

## 3. Initial Founder Staff/Admin Account Promotion

Self-promotion to `is_staff = true` is strictly blocked by RLS (`profiles_self_update`). To promote the founder account:

1. Sign up or sign in once via `/signup` or Supabase Dashboard -> **Authentication** -> **Users**.
2. Run the following SQL in the Supabase SQL Editor (which runs as `postgres` superuser):
   ```sql
   UPDATE public.profiles
   SET is_staff = true
   WHERE id = (
     SELECT id FROM auth.users WHERE email = '<founder-email@notrealengine.com>'
   );
   ```
3. Verify staff access by navigating to `/admin`.

---

## 4. Backup, Monitoring & Rollback

- **Backups:** Enable daily backups / Point-in-Time Recovery (PITR) in Supabase project settings. Treat `quote_acceptances`, `orders`, `payment_transactions`, `project_files`, and `audit_logs` as immutable high-value records.
- **Monitoring:** `SENTRY_DSN` is reserved for error tracking. Review `/admin` telemetry banners and `audit_logs` regularly.
- **Rollback:** Revert to the previous verified Vercel deployment in one click. Database changes strictly use forward-compatible additive migrations (`supabase/migrations/202611080001` through `202611080005`).
