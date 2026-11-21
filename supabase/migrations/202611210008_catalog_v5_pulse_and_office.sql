-- NotRealEngine — Canonical v5 Catalog, NRE PULSE & NRE OFFICE Additive Migration
-- Timestamp: 2026-11-21 (Additive migration 0008; migrations 0001-0007 remain immutable)
-- Governance:
--   1) Archives legacy SVC-* service rows (active = false, canonical = false) WITHOUT deleting
--      so historical project_briefs, packages, orders, and projects retain FK integrity.
--   2) Upserts the 22 canonical v5 services (13 Standalone S01-S13 + 9 Core Technical S14..S24 excl. S16/S20)
--      with sales_mode = 'quote_required' and active = true.
--   3) Adds service_legacy_aliases, catalog_addons (13 active add-ons), service_addon_compatibility,
--      pulse_plans (FLEX/CORE/PRIME), pulse_coverage_modules (M01-M07), project_timeline_events,
--      and si_suggestions (human-in-the-loop drafts) with strict RLS & grants.
--   4) Keeps live checkout and recurring PULSE billing OFF until explicit founder approval.

begin;

-- 1. Archive legacy SVC-* rows cleanly without deleting historical FKs
update public.services
set
  active = false,
  canonical = false,
  updated_at = timezone('utc', now())
where id like 'SVC-%';

-- 2. Add v5 descriptive columns to public.services if not present
alter table public.services
  add column if not exists segment text not null default 'standalone'
    check (segment in ('standalone', 'core_technical')),
  add column if not exists starting_price_minor integer
    check (starting_price_minor is null or starting_price_minor > 0),
  add column if not exists starting_currency text not null default 'BDT'
    check (starting_currency in ('BDT', 'USD')),
  add column if not exists scope_caveat text;

-- 3. Create & upsert canonical v5 categories (public.service_categories was not defined in 0001-0007)
create table if not exists public.service_categories (
  id text primary key,
  name text not null,
  display_order integer not null unique check (display_order > 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.service_categories enable row level security;

drop policy if exists "public_read_service_categories" on public.service_categories;
create policy "public_read_service_categories"
  on public.service_categories for select
  using (true);

grant select on public.service_categories to anon, authenticated;

insert into public.service_categories (id, name, display_order)
values
  ('web-presence', 'Web Presence', 101),
  ('conversion-growth', 'Conversion & Growth', 102),
  ('commerce', 'Commerce', 103),
  ('portals-operations', 'Portals & Operations', 104),
  ('web-app-engineering', 'Web & App Engineering', 105),
  ('mobile-applications', 'Mobile Applications', 106),
  ('business-systems', 'Business Systems', 107),
  ('core-technical', 'Core Technical', 108)
on conflict (id) do update
set
  name = excluded.name,
  display_order = excluded.display_order;

-- 4. Upsert the 22 canonical v5 services (order 1..22; retired S16 & S20 excluded)
insert into public.services (
  id, category_id, slug, name, summary, sales_mode, active, canonical,
  display_order, segment, starting_price_minor, starting_currency, scope_caveat
)
values
  ('S01', 'web-presence', 'mini-website', 'Mini Website', 'Compact, fast-loading brand presence for founders and early-stage ventures.', 'quote_required', true, true, 1, 'standalone', 478000, 'BDT', null),
  ('S02', 'web-presence', 'business-website', 'Business Website', 'Structured multi-page company website engineered for brand authority and lead capture.', 'quote_required', true, true, 2, 'standalone', 550000, 'BDT', null),
  ('S03', 'conversion-growth', 'landing-page-development', 'Landing Page Development', 'Focused single-objective conversion page built for launches and campaigns.', 'quote_required', true, true, 3, 'standalone', 299900, 'BDT', null),
  ('S04', 'conversion-growth', 'sales-funnel-development', 'Sales Funnel Development', 'Multi-step acquisition journey combining offer positioning and qualification.', 'quote_required', true, true, 4, 'standalone', 399900, 'BDT', null),
  ('S05', 'commerce', 'ecommerce-website-development', 'E-commerce Website Development', 'Complete online storefront with structured catalog, cart, and order workflow.', 'quote_required', true, true, 5, 'standalone', 789000, 'BDT', null),
  ('S06', 'portals-operations', 'client-portal-development', 'Client Portal Development', 'Authenticated workspace for client milestones, files, approvals, and requests.', 'quote_required', true, true, 6, 'standalone', 850000, 'BDT', null),
  ('S07', 'portals-operations', 'business-dashboard-development', 'Business Dashboard Development', 'Operational dashboard turning sales, pipeline, and delivery records into clear views.', 'quote_required', true, true, 7, 'standalone', 450000, 'BDT', null),
  ('S08', 'web-app-engineering', 'web-application-development', 'Web Application Development', 'Custom browser-based software with tailored business logic and database architecture.', 'quote_required', true, true, 8, 'standalone', 950000, 'BDT', null),
  ('S09', 'web-app-engineering', 'progressive-web-app-development', 'Progressive Web App Development', 'Installable web software with standalone mobile experience and safe offline resilience.', 'quote_required', true, true, 9, 'standalone', 1250000, 'BDT', null),
  ('S10', 'mobile-applications', 'android-app-development', 'Android App Development', 'Dedicated Android mobile application engineered for reliable device performance.', 'quote_required', true, true, 10, 'standalone', 1850000, 'BDT', null),
  ('S11', 'mobile-applications', 'ios-app-development', 'iOS App Development', 'Dedicated iOS mobile application designed for Apple UX standards and App Store readiness.', 'quote_required', true, true, 11, 'standalone', 2250000, 'BDT', null),
  ('S12', 'business-systems', 'custom-business-software-erp', 'Custom Business Software / ERP', 'Tailored internal software from compact single-module utilities to phased ERP.', 'quote_required', true, true, 12, 'standalone', 500000, 'BDT', 'Starting From BDT 5,000 applies to a small single-purpose utility, not a full multi-module ERP suite.'),
  ('S13', 'web-app-engineering', 'saas-mvp-development', 'SaaS MVP Development', 'Launch-ready multi-tenant software product built to validate market demand.', 'quote_required', true, true, 13, 'standalone', 1950000, 'BDT', null),
  ('S14', 'core-technical', 'payment-gateway-integration', 'Payment Gateway Integration', 'Server-verified integration of approved payment gateways with webhook integrity.', 'quote_required', true, true, 14, 'core_technical', 350000, 'BDT', null),
  ('S15', 'core-technical', 'domain-and-hosting-setup', 'Domain & Hosting Setup', 'Clean DNS, SSL/TLS, custom domain routing, and cloud hosting configuration.', 'quote_required', true, true, 15, 'core_technical', 150000, 'BDT', null),
  ('S17', 'core-technical', 'ui-ux-design', 'UI/UX Design', 'Conversion-aware interface architecture, design systems, and clickable prototypes.', 'quote_required', true, true, 16, 'core_technical', 499000, 'BDT', null),
  ('S18', 'core-technical', 'website-redesign-and-revamp', 'Website Redesign & Revamp', 'Modernize an outdated site for visual polish, mobile responsiveness, and speed.', 'quote_required', true, true, 17, 'core_technical', 350000, 'BDT', null),
  ('S19', 'core-technical', 'database-development-and-setup', 'Database Development & Setup', 'Normalized schema design, RLS policies, indexing, and versioned migrations.', 'quote_required', true, true, 18, 'core_technical', 699000, 'BDT', null),
  ('S21', 'core-technical', 'website-bug-fixing-and-troubleshooting', 'Website Bug Fixing & Troubleshooting', 'Targeted root-cause diagnosis and verified repair for live or staging sites.', 'quote_required', true, true, 19, 'core_technical', 120000, 'BDT', null),
  ('S22', 'core-technical', 'website-feature-development', 'Website Feature Development', 'Scoped engineering additions to an existing website without full rebuilds.', 'quote_required', true, true, 20, 'core_technical', 250000, 'BDT', null),
  ('S23', 'core-technical', 'custom-admin-panel-development', 'Custom Admin Panel Development', 'Dedicated staff operations console with role enforcement and audit trails.', 'quote_required', true, true, 21, 'core_technical', 440000, 'BDT', null),
  ('S24', 'core-technical', 'seo-and-aeo-optimization', 'SEO & AEO Optimization', 'Technical search and answer-engine optimization with semantic markup and schema.', 'quote_required', true, true, 22, 'core_technical', 320000, 'BDT', 'Includes AI-assisted structured schema with mandatory human review; search rankings cannot be guaranteed.')
on conflict (id) do update
set
  category_id = excluded.category_id,
  slug = excluded.slug,
  name = excluded.name,
  summary = excluded.summary,
  sales_mode = 'quote_required',
  active = true,
  canonical = true,
  display_order = excluded.display_order,
  segment = excluded.segment,
  starting_price_minor = excluded.starting_price_minor,
  starting_currency = excluded.starting_currency,
  scope_caveat = excluded.scope_caveat,
  updated_at = timezone('utc', now());

-- 5. Legacy alias compatibility registry
create table if not exists public.service_legacy_aliases (
  legacy_service_id text primary key references public.services(id),
  v5_service_ids text[] not null,
  relationship text not null check (relationship in ('direct', 'partial_split', 'archived_campaign')),
  notes text not null,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.service_legacy_aliases (legacy_service_id, v5_service_ids, relationship, notes)
values
  ('SVC-01-SPW', array['S03', 'S01'], 'archived_campaign', 'Legacy BDT 999 campaign archived; see S03 Landing Page or S01 Mini Website.'),
  ('SVC-02-MIN', array['S01'], 'direct', 'Migrated directly to S01 Mini Website.'),
  ('SVC-03-BIZ', array['S02'], 'direct', 'Migrated directly to S02 Business Website.'),
  ('SVC-04-FUN', array['S04'], 'direct', 'Migrated directly to S04 Sales Funnel Development.'),
  ('SVC-05-EFC', array['S05'], 'direct', 'Migrated directly to S05 E-commerce Website Development.'),
  ('SVC-06-WAP', array['S08'], 'direct', 'Migrated directly to S08 Web Application Development.'),
  ('SVC-07-PWA', array['S09'], 'direct', 'Migrated directly to S09 Progressive Web App Development.'),
  ('SVC-08-MOB', array['S10', 'S11'], 'partial_split', 'Split into S10 Android App Development and S11 iOS App Development.'),
  ('SVC-09-CSE', array['S12'], 'direct', 'Migrated to S12 Custom Business Software / ERP.'),
  ('SVC-10-MVP', array['S13'], 'direct', 'Migrated directly to S13 SaaS MVP Development.'),
  ('SVC-11-BMS', array['S07', 'S23'], 'partial_split', 'Split into S07 Business Dashboard Development and S23 Custom Admin Panel Development.'),
  ('SVC-12-BCP', array['S06'], 'direct', 'Migrated directly to S06 Client Portal Development.')
on conflict (legacy_service_id) do update
set
  v5_service_ids = excluded.v5_service_ids,
  relationship = excluded.relationship,
  notes = excluded.notes;

-- 6. Canonical v5 Add-ons (13 active add-ons) & Service Compatibility Matrix
create table if not exists public.catalog_addons (
  id text primary key,
  slug text not null unique,
  name text not null,
  summary text not null,
  starting_price_minor integer not null check (starting_price_minor > 0),
  currency text not null default 'BDT' check (currency in ('BDT', 'USD')),
  active boolean not null default true,
  display_order integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.catalog_addons (id, slug, name, summary, starting_price_minor, currency, active, display_order)
values
  ('A01', 'extra-website-page', 'Extra Website Page', 'Add an additional custom-designed responsive page matching your site architecture.', 150000, 'BDT', true, 1),
  ('A02', 'booking-and-appointment-system', 'Booking & Appointment System', 'Interactive scheduling, availability slots, and booking confirmation workflow.', 181000, 'BDT', true, 2),
  ('A03', 'forms-and-lead-capture', 'Forms & Lead Capture', 'Multi-field validated inquiry forms with spam protection and routing.', 149000, 'BDT', true, 3),
  ('A06', 'ecommerce-product-upload-catalog-setup', 'E-commerce Product Upload & Catalog Setup', 'Structured SKU entry, category mapping, variants, and media setup.', 199000, 'BDT', true, 4),
  ('A09', 'app-store-play-store-publishing', 'App Store / Play Store Publishing', 'Store listing compliance prep, signing configuration, and submission handoff.', 499000, 'BDT', true, 5),
  ('A10', 'software-testing-and-qa', 'Software Testing & QA', 'Structured functional, responsive, edge-case, and regression verification suite.', 150000, 'BDT', true, 6),
  ('A11', 'software-deployment', 'Software Deployment', 'Production environment configuration, CI/CD wiring, and verified go-live.', 150000, 'BDT', true, 7),
  ('A13', 'responsive-design-optimization', 'Responsive Design Optimization', 'Fine-tuned mobile, tablet, and ultra-wide layout polish with 320px verification.', 149000, 'BDT', true, 8),
  ('A14', 'multi-language-website-setup', 'Multi-Language Website Setup', 'Bilingual or multilingual content structure including Bangla + English.', 250000, 'BDT', true, 9),
  ('A15', 'custom-animation-and-interactive-effects', 'Custom Animation & Interactive Effects', 'Reduced-motion-safe interactive transitions and micro-interactions.', 299000, 'BDT', true, 10),
  ('A17', 'ecommerce-shipping-and-courier-integration', 'E-commerce Shipping & Courier Integration', 'Delivery zone rates and courier workflow integration.', 250000, 'BDT', true, 11),
  ('A18', 'customer-login-and-account-system', 'Customer Login & Account System', 'Authenticated customer accounts, saved profiles, and recovery.', 299000, 'BDT', true, 12),
  ('A19', 'custom-website-calculator-quotation-tool', 'Custom Website Calculator / Quotation Tool', 'Interactive scope, ROI, or quotation estimator built into your site.', 450000, 'BDT', true, 13)
on conflict (id) do update
set
  name = excluded.name,
  summary = excluded.summary,
  starting_price_minor = excluded.starting_price_minor,
  active = excluded.active,
  display_order = excluded.display_order;

create table if not exists public.service_addon_compatibility (
  service_id text not null references public.services(id) on delete cascade,
  addon_id text not null references public.catalog_addons(id) on delete cascade,
  primary key (service_id, addon_id)
);

insert into public.service_addon_compatibility (service_id, addon_id)
values
  -- A01
  ('S02', 'A01'), ('S18', 'A01'),
  -- A02
  ('S01', 'A02'), ('S02', 'A02'), ('S03', 'A02'), ('S04', 'A02'), ('S05', 'A02'), ('S06', 'A02'), ('S08', 'A02'), ('S09', 'A02'),
  -- A03
  ('S01', 'A03'), ('S02', 'A03'), ('S03', 'A03'), ('S04', 'A03'), ('S06', 'A03'), ('S08', 'A03'), ('S09', 'A03'), ('S18', 'A03'), ('S22', 'A03'),
  -- A06
  ('S05', 'A06'),
  -- A09
  ('S10', 'A09'), ('S11', 'A09'),
  -- A10
  ('S02', 'A10'), ('S05', 'A10'), ('S06', 'A10'), ('S08', 'A10'), ('S09', 'A10'), ('S10', 'A10'), ('S11', 'A10'), ('S12', 'A10'), ('S13', 'A10'), ('S19', 'A10'), ('S23', 'A10'),
  -- A11
  ('S08', 'A11'), ('S09', 'A11'), ('S10', 'A11'), ('S11', 'A11'), ('S12', 'A11'), ('S13', 'A11'), ('S19', 'A11'), ('S23', 'A11'),
  -- A13
  ('S02', 'A13'), ('S03', 'A13'), ('S05', 'A13'), ('S06', 'A13'), ('S08', 'A13'), ('S09', 'A13'), ('S18', 'A13'), ('S22', 'A13'),
  -- A14
  ('S01', 'A14'), ('S02', 'A14'), ('S03', 'A14'), ('S05', 'A14'), ('S06', 'A14'), ('S08', 'A14'), ('S09', 'A14'), ('S18', 'A14'),
  -- A15
  ('S01', 'A15'), ('S02', 'A15'), ('S03', 'A15'), ('S04', 'A15'), ('S05', 'A15'), ('S06', 'A15'), ('S08', 'A15'), ('S09', 'A15'), ('S18', 'A15'),
  -- A17
  ('S05', 'A17'),
  -- A18
  ('S02', 'A18'), ('S05', 'A18'), ('S08', 'A18'), ('S09', 'A18'), ('S18', 'A18'), ('S22', 'A18'),
  -- A19
  ('S01', 'A19'), ('S02', 'A19'), ('S03', 'A19'), ('S05', 'A19'), ('S08', 'A19'), ('S09', 'A19'), ('S18', 'A19')
on conflict (service_id, addon_id) do nothing;

-- 7. NRE PULSE Plans & 7 Coverage Modules (M01-M07) — billing disabled by default
create table if not exists public.pulse_plans (
  id text primary key,
  code text not null unique,
  name text not null,
  weekly_starting_minor integer not null check (weekly_starting_minor > 0),
  proposed_monthly_minor integer not null check (proposed_monthly_minor > 0),
  monthly_approved boolean not null default false,
  billing_enabled boolean not null default false,
  currency text not null default 'BDT' check (currency in ('BDT', 'USD')),
  eligibility_note text not null,
  display_order integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.pulse_plans (id, code, name, weekly_starting_minor, proposed_monthly_minor, monthly_approved, billing_enabled, currency, eligibility_note, display_order)
values
  ('PULSE_FLEX', 'FLEX', 'NRE PULSE — FLEX', 299000, 999000, false, false, 'BDT', 'Eligibility review and written scope required before onboarding.', 1),
  ('PULSE_CORE', 'CORE', 'NRE PULSE — CORE', 499000, 1699000, false, false, 'BDT', 'Includes technical onboarding check and written coverage schedule.', 2),
  ('PULSE_PRIME', 'PRIME', 'NRE PULSE — PRIME', 1199000, 3999000, false, false, 'BDT', 'Dedicated onboarding audit, written scope schedule, and executive escalation.', 3)
on conflict (id) do update
set
  name = excluded.name,
  weekly_starting_minor = excluded.weekly_starting_minor,
  proposed_monthly_minor = excluded.proposed_monthly_minor,
  eligibility_note = excluded.eligibility_note,
  display_order = excluded.display_order;

create table if not exists public.pulse_coverage_modules (
  id text primary key,
  name text not null,
  summary text not null,
  display_order integer not null
);

insert into public.pulse_coverage_modules (id, name, summary, display_order)
values
  ('M01', 'Website Maintenance & Support', 'Routine framework hygiene, dependency updates, and production health verification.', 1),
  ('M02', 'Database Management', 'Schema monitoring, query health reviews, and migration supervision.', 2),
  ('M03', 'Website Security Monitoring & Maintenance', 'Security headers, dependency vulnerability triage, and access-control review.', 3),
  ('M04', 'Automated Backup Management', 'Scheduled backup verification, retention hygiene, and restoration drills.', 4),
  ('M05', 'Website Content Update & Management', 'Structured copy, banner, pricing, and page updates handled safely.', 5),
  ('M06', 'Mobile App Maintenance & Updates', 'OS compatibility updates, crash triage, and release build support.', 6),
  ('M07', 'Technical Support & Troubleshooting', 'Root-cause debugging, integration diagnostics, and human-reviewed assistance.', 7)
on conflict (id) do update
set
  name = excluded.name,
  summary = excluded.summary,
  display_order = excluded.display_order;

-- 8. Evidence-backed Project Timeline Events (NRE OFFICE transparency)
create table if not exists public.project_timeline_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  title text not null,
  detail text not null default '',
  visible_to_client boolean not null default true,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_project_timeline_events_project
  on public.project_timeline_events (project_id, created_at desc);

drop trigger if exists trg_verify_project_timeline_org on public.project_timeline_events;
create trigger trg_verify_project_timeline_org
  before insert or update of project_id, organization_id on public.project_timeline_events
  for each row execute function public.verify_project_organization_match();

-- 9. SI Human-in-the-Loop Draft Suggestions (never autonomous commits)
create table if not exists public.si_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('project_brief', 'quote', 'project', 'support_ticket')),
  entity_id uuid not null,
  suggestion_kind text not null,
  draft_payload jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'under_review', 'reviewed', 'approved', 'rejected', 'applied', 'dismissed')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- 10. Row Level Security & Least-Privilege Grants
alter table public.service_legacy_aliases enable row level security;
alter table public.catalog_addons enable row level security;
alter table public.service_addon_compatibility enable row level security;
alter table public.pulse_plans enable row level security;
alter table public.pulse_coverage_modules enable row level security;
alter table public.project_timeline_events enable row level security;
alter table public.si_suggestions enable row level security;

-- Public read-only access for catalog & PULSE reference tables
drop policy if exists "public_read_legacy_aliases" on public.service_legacy_aliases;
create policy "public_read_legacy_aliases" on public.service_legacy_aliases for select using (true);

drop policy if exists "public_read_catalog_addons" on public.catalog_addons;
create policy "public_read_catalog_addons" on public.catalog_addons for select using (active = true);

drop policy if exists "public_read_service_addon_compat" on public.service_addon_compatibility;
create policy "public_read_service_addon_compat" on public.service_addon_compatibility for select using (true);

drop policy if exists "public_read_pulse_plans" on public.pulse_plans;
create policy "public_read_pulse_plans" on public.pulse_plans for select using (true);

drop policy if exists "public_read_pulse_modules" on public.pulse_coverage_modules;
create policy "public_read_pulse_modules" on public.pulse_coverage_modules for select using (true);

-- Tenant-scoped timeline events (enforces verified 0-arg current_user_is_staff(), 1-arg is_org_member(uuid), and project-org match)
drop policy if exists "org_members_read_project_timeline" on public.project_timeline_events;
create policy "org_members_read_project_timeline"
  on public.project_timeline_events for select to authenticated
  using (
    public.current_user_is_staff()
    or (
      visible_to_client = true
      and exists (
        select 1 from public.projects p
        where p.id = project_id
          and p.organization_id = organization_id
          and public.is_org_member(organization_id)
      )
    )
  );

drop policy if exists "staff_manage_project_timeline" on public.project_timeline_events;
create policy "staff_manage_project_timeline"
  on public.project_timeline_events for all to authenticated
  using (public.current_user_is_staff())
  with check (
    public.current_user_is_staff()
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.organization_id = organization_id
    )
  );

-- SI suggestions are strictly staff-only until reviewed
drop policy if exists "staff_manage_si_suggestions" on public.si_suggestions;
create policy "staff_manage_si_suggestions"
  on public.si_suggestions for all to authenticated
  using (public.current_user_is_staff())
  with check (public.current_user_is_staff());

grant select on public.service_legacy_aliases, public.catalog_addons, public.service_addon_compatibility, public.pulse_plans, public.pulse_coverage_modules to anon, authenticated;
grant select, insert, update, delete on public.project_timeline_events, public.si_suggestions to authenticated;

commit;
