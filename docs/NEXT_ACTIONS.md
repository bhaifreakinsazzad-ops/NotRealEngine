# Remaining Founder Actions — 2026-11-08 (Directive V12.0)

Only actions that genuinely require founder authority or external provider credentials remain:

## 1. Apply Migration `0005` in Supabase SQL Editor (Immediate)
Open the **Supabase Dashboard SQL Editor** for project `yamwmfgqqjwlfcjjkwzl` and run:
- [`supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql`](../supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql)

## 2. Connect Hosted Vercel Deployment (Release A)
Either import `bhaifreakinsazzad-ops/NotRealEngine` (`main`) in the Vercel Dashboard with the environment variables listed in [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md), or run locally:
```powershell
npx.cmd vercel login
npx.cmd vercel link
npx.cmd vercel deploy
```

## 3. Confirm First Founder Super-Admin Account (Release A)
After signing up and confirming your email address in Supabase Auth, promote your account:
```powershell
node scripts/promote-founder-admin.mjs --email <your-verified-founder-email>
```

## 4. Legal Text Approval for Binding Production Quotes (Release B)
When final legal text is approved by founder/counsel:
1. Replace draft text on `/terms`, `/privacy`, and `/refund-policy`.
2. Insert or update an `approved_production` row in `public.commercial_terms_versions` with `approved_by`, `approved_at`, and `approval_reference`.

## 5. Payment & Notification Provider Activation (Release C)
Keep `PAYMENTS_ENABLED=false` and `NOTIFICATIONS_ENABLED=false` until verified merchant/email credentials (`SSLCommerz`, `bKash`, `Stripe`, `Resend`) are provisioned and tested.
