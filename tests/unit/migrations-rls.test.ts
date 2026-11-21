import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

function readAllMigrations(): { name: string; sql: string }[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((name) => ({
    name,
    sql: fs.readFileSync(path.join(MIGRATIONS_DIR, name), "utf8"),
  }));
}

describe("Supabase migrations & multi-tenant RLS static integrity", () => {
  const migrations = readAllMigrations();

  it("never invokes nonexistent public.is_staff(...) or 2-argument public.is_org_member(a, b) in any migration", () => {
    for (const { name, sql } of migrations) {
      expect(sql, `${name} must not reference nonexistent public.is_staff()`).not.toMatch(
        /\bpublic\.is_staff\s*\(/i,
      );
      // 2-argument call has a comma inside public.is_org_member(...)
      expect(sql, `${name} must only call 1-arg public.is_org_member(org_id)`).not.toMatch(
        /\bpublic\.is_org_member\s*\([^)]*,[^)]*\)/i,
      );
    }
  });

  it("creates public.service_categories before inserting into it in 0008", () => {
    const m0008 = migrations.find((m) => m.name.startsWith("202611210008"));
    expect(m0008).toBeDefined();
    const sql = m0008!.sql.toLowerCase();
    const createIdx = sql.indexOf("create table if not exists public.service_categories");
    const insertIdx = sql.indexOf("insert into public.service_categories");
    expect(createIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(createIdx);
  });

  it("enforces project-to-organization cross-tenant consistency triggers on timeline, assignments, and messages", () => {
    const m0008 = (migrations.find((m) => m.name.startsWith("202611210008"))?.sql ?? "").toLowerCase();
    const m0009 = (migrations.find((m) => m.name.startsWith("202611210009"))?.sql ?? "").toLowerCase();

    expect(m0008).toContain("trg_verify_project_timeline_org");
    expect(m0008).toContain("public.verify_project_organization_match()");
    expect(m0008).toContain("public.current_user_is_staff()");

    expect(m0009).toContain("alter table public.project_assignments enable row level security");
    expect(m0009).toContain("alter table public.project_messages enable row level security");
    expect(m0009).toContain("alter table public.pulse_subscriptions enable row level security");
    expect(m0009).toContain("trg_verify_project_assignments_org");
    expect(m0009).toContain("trg_verify_project_messages_org");
    expect(m0009).toContain("tickets_staff_all");
  });

  it("enforces human-approval SI transition guard and manual-invoicing-only PULSE billing at database level", () => {
    const m0009 = (migrations.find((m) => m.name.startsWith("202611210009"))?.sql ?? "").toLowerCase();
    expect(m0009).toContain("si_suggestions_transition_guard");
    expect(m0009).toMatch(/check\s*\(\s*billing_mode\s*=\s*'manual_invoicing_only'\s*\)/);
    expect(m0009).toContain("service_legacy_aliases");
  });
});
