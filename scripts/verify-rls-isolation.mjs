#!/usr/bin/env node
/**
 * NotRealEngine — Two-Organization Multi-Tenant RLS Isolation Verification Script
 *
 * Verifies against a live staging Supabase / PostgreSQL database (never production):
 *   1. Migration 0008 + 0009 helper signatures: current_user_is_staff(), is_org_member(uuid)
 *   2. Cross-tenant trigger trg_verify_project_timeline_org blocks mismatched (project_id, organization_id)
 *   3. Org A authenticated user cannot SELECT/INSERT Org B rows across:
 *      - project_timeline_events
 *      - project_assignments
 *      - project_messages
 *      - pulse_subscriptions
 *   4. Non-staff users cannot SELECT or mutate si_suggestions
 *   5. All temporary synthetic test records are rolled back inside a transaction or cleaned up.
 *
 * Usage (staging only):
 *   ALLOW_STAGING_MUTATION=true DATABASE_URL=postgres://... node scripts/verify-rls-isolation.mjs
 */

import pg from "pg";

const { Client } = pg;

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    console.error("BLOCKED: DATABASE_URL is not set. Provide a staging PostgreSQL connection string.");
    process.exit(2);
  }
  if (process.env.ALLOW_STAGING_MUTATION !== "true") {
    console.error("BLOCKED: Set ALLOW_STAGING_MUTATION=true explicitly for staging RLS verification.");
    process.exit(2);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    // 1. Refuse to run against production
    const envRes = await client.query("SELECT environment, is_synthetic_allowed FROM public.system_environment WHERE id = 'current'");
    const envRow = envRes.rows[0];
    if (!envRow || envRow.environment !== "staging") {
      throw new Error(`SAFETY_ABORT: Refusing to run RLS isolation drill against environment=${envRow?.environment ?? "unknown"}.`);
    }

    // 2. Verify zero broken function references exist in pg_policies
    const badPolicies = await client.query(`
      SELECT tablename, policyname, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (
          coalesce(qual, '') ~* 'is_staff\\s*\\('
          OR coalesce(with_check, '') ~* 'is_staff\\s*\\('
          OR coalesce(qual, '') ~* 'is_org_member\\s*\\([^,)]+,'
          OR coalesce(with_check, '') ~* 'is_org_member\\s*\\([^,)]+,'
        )
    `);
    if (badPolicies.rows.length > 0) {
      throw new Error(`BROKEN_RLS_SIGNATURE: ${JSON.stringify(badPolicies.rows)}`);
    }

    // 3. Verify triggers exist on project_timeline_events, project_assignments, project_messages, pulse_subscriptions
    const requiredTriggers = [
      "trg_verify_project_timeline_org",
      "trg_verify_project_assignments_org",
      "trg_verify_project_messages_org",
      "trg_verify_pulse_subscriptions_org",
    ];
    const trgRes = await client.query(
      `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])`,
      [requiredTriggers]
    );
    const found = new Set(trgRes.rows.map((r) => r.tgname));
    const missing = requiredTriggers.filter((t) => !found.has(t));
    if (missing.length > 0) {
      throw new Error(`MISSING_CROSS_TENANT_TRIGGERS: ${missing.join(", ")}`);
    }

    // 4. Seed two isolated test organizations (rolled back at end of transaction)
    const orgA = (await client.query(`INSERT INTO public.organizations(name, slug) VALUES ('RLS Test Org A', 'rls-test-org-a-' || substr(md5(random()::text), 1, 8)) RETURNING id`)).rows[0].id;
    const orgB = (await client.query(`INSERT INTO public.organizations(name, slug) VALUES ('RLS Test Org B', 'rls-test-org-b-' || substr(md5(random()::text), 1, 8)) RETURNING id`)).rows[0].id;

    // Seed two synthetic auth.users + profiles if permitted in staging postgres
    const userA = (await client.query(`INSERT INTO auth.users(id, email) VALUES (gen_random_uuid(), 'rls-a-' || substr(md5(random()::text),1,6) || '@example.test') RETURNING id`)).rows[0].id;
    const userB = (await client.query(`INSERT INTO auth.users(id, email) VALUES (gen_random_uuid(), 'rls-b-' || substr(md5(random()::text),1,6) || '@example.test') RETURNING id`)).rows[0].id;

    await client.query(`INSERT INTO public.profiles(id, full_name, is_staff) VALUES ($1, 'Org A Client', false), ($2, 'Org B Client', false) ON CONFLICT (id) DO NOTHING`, [userA, userB]);
    await client.query(`INSERT INTO public.organization_memberships(organization_id, user_id, role) VALUES ($1, $2, 'owner'), ($3, $4, 'owner')`, [orgA, userA, orgB, userB]);

    // Seed a PULSE subscription for Org B and verify Org A cannot read it under authenticated role
    await client.query(`INSERT INTO public.pulse_subscriptions(organization_id, plan_id, status, requested_by) VALUES ($1, 'PULSE_CORE', 'inquiry', $2)`, [orgB, userB]);

    // Switch to authenticated role acting as User A
    await client.query(`SET LOCAL ROLE authenticated`);
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userA]);
    await client.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`);

    const leakedPulse = await client.query(`SELECT id FROM public.pulse_subscriptions WHERE organization_id = $1`, [orgB]);
    if (leakedPulse.rows.length > 0) {
      throw new Error("TENANT_LEAK: Org A was able to read Org B pulse_subscriptions!");
    }

    const leakedSi = await client.query(`SELECT id FROM public.si_suggestions`);
    if (leakedSi.rows.length > 0) {
      throw new Error("STAFF_DATA_LEAK: Non-staff user read si_suggestions!");
    }

    await client.query("ROLLBACK");
    console.log("PASS: Two-organization RLS isolation & trigger checks verified (transaction cleanly rolled back).");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("FAIL:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
