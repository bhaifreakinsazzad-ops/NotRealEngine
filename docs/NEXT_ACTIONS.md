# Remaining Founder Actions — 2026-11-08 (Directive V13.0)

Only actions that genuinely require founder authority or external provider credentials remain:

## 1. Apply Migration `0006` in Supabase SQL Editor (Immediate)
Open the **Supabase Dashboard SQL Editor** for project `yamwmfgqqjwlfcjjkwzl` and execute:
- [`supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql`](../supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql)

*(If Migration 0005 has not been applied yet, paste `supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql` first or execute `supabase/bootstrap.sql` which contains all definitions).*

## 2. Promote First Founder Super-Admin Account (Release A)
After signing up / confirming your email in Supabase Auth on `https://notrealengine.vercel.app`, promote your profile to founder super-admin:
```sql
UPDATE public.profiles
SET is_staff = true,
    role = 'super_admin'
WHERE id = '<your-auth-user-uuid>';
```
Or run locally:
```powershell
node scripts/promote-founder-admin.mjs --email <your-verified-email>
```

## 3. Legal Text Approval for Binding Production Quotes (Release B)
When final legal text is approved by founder and legal counsel:
1. Replace draft text on `/terms`, `/privacy`, and `/refund-policy`.
2. As founder super-admin, call the dedicated RPC:
   ```sql
   SELECT public.approve_commercial_terms(
     'ENGINE//OS-TERMS-V1.0',
     'BOARD-RESOLUTION-2026-01',
     'Approved production commercial terms for general intake'
   );
   ```

## 4. Payment & Notification Provider Activation (Release C)
Keep `PAYMENTS_ENABLED=false` and `NOTIFICATIONS_ENABLED=false` until verified merchant/email credentials (`SSLCommerz`, `bKash`, `Stripe`, `Resend`) are provisioned and tested in live/sandbox accounts.
