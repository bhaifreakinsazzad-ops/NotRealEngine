# ENGINE//OS — Next Implementation Actions Queue
Updated: 2026-11-08 by Gemini Coding Agent (Directive V8.0 Review)

This document tracks prioritized, actionable engineering batches.

---

### Immediate Next Implementation Batches

#### [TASK-OPS-01] Staging Database Key Configuration & Migration Run
- **Priority:** Critical (P0)
- **Status:** BLOCKED pending Supabase anon/service keys for `https://yamwmfgqqjwlfcjjkwzl.supabase.co`
- **Dependencies:** Staging Supabase API key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`)
- **Required Work:**
  1. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` or host secrets.
  2. Apply migrations `202611080001_engine_os_foundation.sql`, `202611080002_seed_canonical_services.sql`, and `202611080003_security_hardening.sql` to `yamwmfgqqjwlfcjjkwzl`.
  3. Execute `npm run verify:staging` to verify that all 10 staging checks transition from BLOCKED to PASS.
  4. Verify two-tenant isolation with synthetic accounts.

---

#### [TASK-GIT-01] Remote GitHub Synchronization
- **Priority:** High (P1)
- **Status:** READY for push by developer/founder
- **Dependencies:** GitHub credentials for `bhaifreakinsazzad-ops/NotRealEngine`
- **Required Work:**
  1. Run `git push origin master` (or merge `master` into `main`) from an authenticated terminal or GUI client to update `github.com/bhaifreakinsazzad-ops/NotRealEngine`.

---

#### [TASK-LEGAL-01] Legal Copy Finalization
- **Priority:** High (P1)
- **Status:** BLOCKED pending founder/counsel text
- **Dependencies:** Approved copy for Privacy Policy, Terms of Service, and Refund Policy
- **Required Work:**
  1. Replace draft placeholders in `app/privacy/page.tsx`, `app/terms/page.tsx`, and `app/refund-policy/page.tsx`.
  2. Remove `DRAFT — NOT APPROVED` warning banners upon written authorization.
