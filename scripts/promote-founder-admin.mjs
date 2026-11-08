#!/usr/bin/env node
/**
 * ENGINE//OS — Founder Super-Admin Account Promotion Utility (V12.0)
 * Platform: NOTREAL ENGINE, LLC
 * Directive: Master Directive V12.0 Section 8
 *
 * Usage:
 *   node scripts/promote-founder-admin.mjs --user-id <verified-founder-auth-user-uuid>
 *   node scripts/promote-founder-admin.mjs --email <verified-founder-email>
 *
 * Security Rules:
 * - Never creates a public staff-registration flow.
 * - Never hardcodes credentials in source code.
 * - Requires SUPABASE_SERVICE_ROLE_KEY in local environment (.env.local).
 * - Verifies that the target user exists in auth.users with a confirmed email before promoting.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnv() {
  for (const envFile of [".env.local", ".env"]) {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

async function main() {
  const args = process.argv.slice(2);
  const userIdIdx = args.indexOf("--user-id");
  const emailIdx = args.indexOf("--email");

  const targetUserId = userIdIdx !== -1 ? args[userIdIdx + 1] : null;
  const targetEmail = emailIdx !== -1 ? args[emailIdx + 1] : null;

  if (!targetUserId && !targetEmail) {
    console.error("Usage:");
    console.error("  node scripts/promote-founder-admin.mjs --user-id <verified-founder-auth-user-uuid>");
    console.error("  node scripts/promote-founder-admin.mjs --email <verified-founder-email>");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local.");
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let resolvedUser = null;
  if (targetUserId) {
    const { data, error } = await adminClient.auth.admin.getUserById(targetUserId);
    if (error || !data?.user) {
      console.error(`Error: Auth user "${targetUserId}" not found (${error?.message ?? "unknown"}).`);
      process.exit(1);
    }
    resolvedUser = data.user;
  } else if (targetEmail) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) {
      console.error(`Error listing users: ${error.message}`);
      process.exit(1);
    }
    resolvedUser = data.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
    if (!resolvedUser) {
      console.error(`Error: No Supabase Auth user found with email "${targetEmail}".`);
      process.exit(1);
    }
  }

  if (!resolvedUser.email_confirmed_at) {
    console.error(`Refusing to promote unverified account (${resolvedUser.email}). Email confirmation is required first.`);
    process.exit(1);
  }

  // Promote in public.profiles (supports both base schema and Migration 0005 role column)
  let updateResult = await adminClient
    .from("profiles")
    .upsert({
      id: resolvedUser.id,
      full_name: resolvedUser.user_metadata?.full_name || "Founder Super Admin",
      is_staff: true,
      role: "super_admin",
      updated_at: new Date().toISOString()
    })
    .select("id, full_name, is_staff")
    .single();

  if (updateResult.error && updateResult.error.message.includes("role")) {
    updateResult = await adminClient
      .from("profiles")
      .upsert({
        id: resolvedUser.id,
        full_name: resolvedUser.user_metadata?.full_name || "Founder Super Admin",
        is_staff: true,
        updated_at: new Date().toISOString()
      })
      .select("id, full_name, is_staff")
      .single();
  }

  if (updateResult.error) {
    console.error(`Error updating profile: ${updateResult.error.message}`);
    process.exit(1);
  }

  await adminClient.from("audit_logs").insert({
    actor_id: resolvedUser.id,
    action: "founder.super_admin_promoted",
    entity_type: "profile",
    entity_id: resolvedUser.id,
    after_data: {
      email: resolvedUser.email,
      is_staff: true,
      role: "super_admin",
      promotedAt: new Date().toISOString()
    }
  });

  console.log(`Successfully promoted verified founder account to staff super_admin:`);
  console.log(`  User ID : ${resolvedUser.id}`);
  console.log(`  Email   : ${resolvedUser.email}`);
  console.log(`  Staff   : true (super_admin)`);
}

main().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exit(1);
});
