# Remaining Founder Actions — 2026-11-09 (Directive V14.0)

Only actions that genuinely require founder authority or external provider credentials remain:

## 1. Apply Migration `0006` in Supabase SQL Editor (Immediate)
Open the **Supabase Dashboard SQL Editor** for project `yamwmfgqqjwlfcjjkwzl` and execute:
- [`supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql`](../supabase/migrations/202611080006_v13_terms_environment_and_founder_governance.sql)

*(If Migration 0005 has not been applied yet, execute `supabase/bootstrap.sql` which contains all definitions up to `0006`).*

## 2. Configure LeadConnector Webhook Secret on Vercel
1. Generate a secure 32-byte secret.
2. In Vercel Project Settings -> Environment Variables, add:
   - `LEADCONNECTOR_WEBHOOK_SECRET` = `<your-secret>`
3. In GoHighLevel / LeadConnector Workflow or Webhook triggers, set the destination URL to:
   - `https://app.notrealengine.online/api/webhooks/leadconnector`
   - Header: `x-leadconnector-key: <your-secret>`

## 3. Configure External GHL Client Portal DNS (Optional)
If you intend to use GoHighLevel's external portal at `clientportal.notrealengine.online`:
1. In your domain DNS manager, create a **CNAME** record:
   - Host: `clientportal`
   - Value: `msgsndr.online` (or your designated LeadConnector portal target)
2. Until verified, native workspace navigation is securely routed to `/dashboard`.

## 4. Promote First Founder Super-Admin Account (Release A)
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

## 5. Legal Text Approval for Binding Production Quotes (Release B)
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

## 6. Payment & Notification Provider Activation (Release C)
Keep `PAYMENTS_ENABLED=false` and `NOTIFICATIONS_ENABLED=false` until verified merchant/email credentials (`SSLCommerz`, `bKash`, `Stripe`, `Resend`) are provisioned and tested in live/sandbox accounts.
