# ENGINE//OS — Security Audit & Hardening Report
Version: 1.0 · Date: 2026-11-08 · Auditor: Gemini Coding Agent

---

## 1. Executive Security Posture

ENGINE//OS is architected with a **Defense-in-Depth, Zero-Trust, Fail-Closed** security posture designed for multi-tenant digital commerce and project management.

| Security Layer | Implementation Mechanism | Status |
|---|---|---|
| **Perimeter Routing** | `proxy.ts` (Next.js 16 session refresh) & `lib/auth.ts` (`requireUser`, `requireAdmin`) | VERIFIED |
| **Database Isolation** | PostgreSQL Row Level Security (RLS) across all 24 public tables | VERIFIED |
| **RPC Functions** | `security definer set search_path = public`, execution restricted via explicit GRANT/REVOKE | VERIFIED |
| **Race Conditions** | `SELECT ... FOR UPDATE` row locking during quotation acceptance (`decide_quote`) | VERIFIED |
| **Storage Security** | Bucket file-size limit (50MB), MIME whitelist, strict `${projectId}/` path prefix | HARDENED |
| **Path Traversal Defense** | Server-side validation against `..`, null bytes, and path separators in `storagePath` | HARDENED |
| **Payment Security** | Constant-time HMAC verification (`timingSafeEqual`), replay defense, idempotent deduplication | HARDENED |
| **Outbox Automation** | Bearer token authorization required on cron trigger endpoint (`CRON_SECRET`) | HARDENED |
| **Legal Status** | Legal pages visibly flagged DRAFT; no unapproved binding contracts accepted | COMPLIANT |

---

## 2. Row Level Security & Multi-Tenant Isolation

### 2.1 Table-Level RLS Enforcement
Every public table in `supabase/migrations/202611080001_engine_os_foundation.sql` has Row Level Security enabled:
```sql
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
-- [All 24 tables strictly governed]
```

### 2.2 Security Definer Helper Functions
To prevent authorization bypasses, access checks use PostgreSQL helper functions with explicit search paths:
- `public.current_user_is_staff()`: Inspects `public.profiles` for `is_staff = true` for `auth.uid()`.
- `public.is_org_member(org_id)`: Verifies membership in `public.organization_memberships`.
- `public.is_org_admin(org_id)`: Verifies `role = 'owner'` or `'admin'`.

### 2.3 Private Storage Bucket Isolation
Storage objects in `project-files` bucket are protected by database RLS:
```sql
create policy project_files_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'project-files' and exists (
    select 1 from public.projects p where p.id::text = (storage.foldername(name))[1] 
    and (public.is_org_member(p.organization_id) or public.current_user_is_staff())
  )
);
```

---

## 3. Server Actions & Mutation Hardening

### 3.1 Storage Path Traversal Remediation
In `app/dashboard/actions.ts` (`registerUploadedFileAction`):
- **Vulnerability Remediated:** Previously, client-supplied `storagePath` could theoretically reference arbitrary paths outside the project directory.
- **Enforced Rule:** The server action verifies:
  1. `storagePath.startsWith(`${projectId}/`)` is strictly true.
  2. Relative path contains no `..`, `/`, `\`, or null bytes.
  3. Authenticated user belongs to the target organization.
  4. Project belongs to the target organization.

### 3.2 Double-Acceptance Concurrency Guard
In `decide_quote` RPC:
- `select * into q from public.quotes where id = p_quote_id for update;`
- Row lock prevents race conditions: if two acceptance requests arrive simultaneously, the second transaction sees `state = 'accepted'` and throws `quote_not_acceptable`.
- Unique constraint `orders(quote_id)` guarantees exactly one order per quotation.

---

## 4. Payment Gateway Webhook Audit

### 4.1 Cryptographic Signature Verification
In `lib/integrations/payments/providers.ts` & `app/api/webhooks/payment/route.ts`:
- **Fail-Closed Gate:** If `PAYMENT_WEBHOOK_SECRET` is unset, endpoint returns `503 Service Unavailable`.
- **Timing Attack Defense:** Signatures are evaluated using `crypto.timingSafeEqual`.
- **Stripe Tolerance Window:** Stripe signatures require `timestamp` within 300 seconds to prevent replay attacks.
- **Exact Minor Unit Match:** Webhook event amount and currency must exactly match order record (`total_minor` and `currency`).
- **Deduplication:** Table `webhook_events` enforces unique `(provider, provider_event_id)` preventing duplicate processing.

---

## 5. Security Test Suite Evidence

All security guards are tested in automated unit tests (`tests/unit/security.test.ts`):
- `rejects file registration when storagePath attempts directory traversal (..)`: **PASSED**
- `rejects file registration when storagePath prefix does not match projectId`: **PASSED**
- `rejects file registration with disallowed MIME type`: **PASSED**
- `rejects file registration exceeding 50MB limit`: **PASSED**
- `accepts valid, sanitized file registration within tenant boundaries`: **PASSED**
- `verifies valid HMAC-SHA256 signature with constant-time equality`: **PASSED**
- `rejects tampered payload or forged HMAC signature`: **PASSED**
- `verifies valid Stripe signature within tolerance window`: **PASSED**
- `rejects replayed Stripe signature outside tolerance window`: **PASSED**
- `fails closed when no recognized signature header is present`: **PASSED**
