# Founder Approval Reconciliation — 21 November 2026

## Decision hierarchy
This is a **dated decision record**, not a replacement for the two official brand books. The founder's latest explicit approval of the official Brand Revision v6, master catalog, knowledge base, and pricing supersedes commercial "pending monthly approval" language in earlier sources.

Canonical visual identity stays governed by the approved **English Brand Book v2.0** and **Bangla Brand Book v1.0**. The existing **v5 application code** carries the same 22-service / 13-add-on registry; the v6 label denotes the subsequently approved brand-aligned resource pack, **not** a second catalog to seed in the database.

## Commercial decisions recorded
| Offering | Weekly Starting From (BDT) | Monthly Starting From (BDT) | Founder status |
| --- | ---: | ---: | --- |
| NRE PULSE FLEX | 2,990 | 9,990 | Approved 2026-11-21 |
| NRE PULSE CORE | 4,990 | 16,990 | Approved 2026-11-21 |
| NRE PULSE PRIME | 11,990 | 39,990 | Approved 2026-11-21 |

The above **approves public entry-price wording**, not automatic purchases or unscoped service promises. Existing `proposedMonthlyPriceBdt` and `proposedMonthlyPriceMinor` field names are maintained for compatibility with callers; `monthlyPricingStatus` carries the corrected approval state. The existing 22 Starting From service prices and 13 add-on prices remain unchanged.

## What is deliberately NOT authorized by a catalog approval
- Unreviewed production DNS cutover, live payment transactions or auto-recurring charges.
- Binding production legal acceptance without approved privacy, refund, and terms texts.
- An unverified payment provider/webhook, unlimited tasks, guaranteed resolution time, or 24/7 human engineering.
- New architecture or parallel rewrites that bypass the existing Next.js / Supabase app, RLS, audit trails or historical SVC aliases.

**Billing remains off**: `pulsePlans[].billingEnabled === false`. All offers continue as `quote_required` until a separate, verified commercial activation path is ready.

## Current implementation reality
- Mainline has real NRE SELECT, client/admin workspace routes, project-builder flow, SQL migrations `0001–0008`, automated tests, and staging audit tooling.
- Historical reporting in `docs/RELEASE_READINESS.md`, `docs/NEXT_ACTIONS.md`, and `docs/IMPLEMENTATION_STATUS.md` describes older catalog iterations. Do not interpret those outdated 12-service counts as current.
- The latest live database migration state, cross-tenant staging RLS, payment provider accounts, legal publication and domain cutover **have not been re-verified in this change**.
- Do not edit already-applied migrations `0001–0008`. Add a new migration if the database actually requires a change after current-state verification.

## Release checklist (unchanged safety boundary)
1. Check `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, Playwright smoke paths, and staging RLS before merge or release.
2. Verify the current migration ledger, especially migration `202611210008_catalog_v5_pulse_and_office.sql`.
3. Verify authenticated admin, quote acceptance guardrails, tenant isolation and provider-independent quote flow.
4. Review legal language, provider credentials, tax/fees, support coverage/SLA, founder control and launch domain separately.
5. Only then request explicit authorization for irreversible production activation.

**Source:** latest founder-approved November 21, 2026 project discussion and the repo's canonical v5 registry. This record is for implementation clarity; it does not itself execute a payment, migrate a database, or deploy to production.
