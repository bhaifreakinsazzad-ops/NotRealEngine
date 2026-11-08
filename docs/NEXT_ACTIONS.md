# ENGINE//OS — Next Implementation Actions & Founder Checklist (V11.0)
Updated: 2026-11-08 by Gemini Coding Agent

---

## 1. Completed Engineering Batches (V11.0)

- **[COMPLETE] Database Migration & Security Remediation (`yamwmfgqqjwlfcjjkwzl`):**
  - 30/30 canonical tables verified.
  - 12 canonical services across 10 distinct categories verified.
  - Private `project-files` storage bucket verified.
  - Direct anonymous RPC `submit_project_brief` strictly rejected (`42501 permission denied`).
  - Migration `202611080005_v11_commercial_and_rpc_hardening.sql` authored and appended to `supabase/bootstrap.sql`.
- **[COMPLETE] Real Multi-Tenant E2E Lifecycle Verification (`npm.cmd run verify:staging` — 58/58 PASS):**
  - Real Supabase Auth JWT sessions verified for `Customer A`, `Customer B`, and `Staff`.
  - Cross-tenant RLS isolation verified across organizations, leads, quotes, orders, project requirements, `project_files`, and Storage (`project-files`).
  - Atomic `decide_quote` order creation (`awaiting_payment`) and replay idempotency verified.
  - Revision limit constraint (`revision_count <= revision_limit`) and deliverable approval/delivery verified.
- **[COMPLETE] Admin Financial Metrics Separation (`app/admin/page.tsx`):**
  - Separated into **Total Order Value**, **Unpaid Orders**, **Verified Payments Received** (`state = 'paid'` and `verified_at IS NOT NULL`), **Refunds Recorded**, and **Outstanding Invoices** with BDT/USD currency separation.

---

## 2. Remaining Founder Actions for Release A & Production Launch

### Action 1 (Optional DB Hardening): Apply Migration `202611080005` in Supabase SQL Editor
Run `supabase/migrations/202611080005_v11_commercial_and_rpc_hardening.sql` in the Supabase SQL Editor to enforce `is_org_admin` directly inside the PostgreSQL `decide_quote` RPC and add the `requirements_staff_all` policy (already enforced in Next.js server actions).

### Action 2: Connect Vercel Project for Hosted Preview / Release A
Import `https://github.com/bhaifreakinsazzad-ops/NotRealEngine` (`main` branch) into Vercel and set the environment variables documented in `docs/DEPLOYMENT.md`.

### Action 3: Promote Initial Founder Account to Staff (`is_staff = true`)
After signing up in the application, run in Supabase SQL Editor:
```sql
UPDATE public.profiles
SET is_staff = true
WHERE id = (SELECT id FROM auth.users WHERE email = '<founder-email>');
```

### Action 4: Legal Copy Approval (Pre-Production)
Provide approved legal text for `/privacy`, `/terms`, and `/refund-policy` to remove the `DRAFT — NOT APPROVED FOR PUBLICATION OR ACCEPTANCE` banners.
