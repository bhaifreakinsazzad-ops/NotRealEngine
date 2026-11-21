import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  mapSupabaseLoginError,
  mapSupabaseSignupError,
  normalizeAuthCookieOptions,
  resolveSafeRequestOrigin,
  signupFormSchema,
} from "@/lib/auth-validation";

describe("production signup validation and error handling", () => {
  it("accepts valid signup input and normalizes email/whitespace", () => {
    const res = signupFormSchema.safeParse({
      fullName: "  Sazzad Sharif  ",
      organizationName: " NotRealEngine LLC ",
      email: "  Founder@Example.COM ",
      password: "StrongPassword123",
      confirmPassword: "StrongPassword123",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.fullName).toBe("Sazzad Sharif");
      expect(res.data.organizationName).toBe("NotRealEngine LLC");
      expect(res.data.email).toBe("founder@example.com");
    }
  });

  it("rejects mismatched passwords, weak passwords without numbers, and short passwords", () => {
    expect(
      signupFormSchema.safeParse({
        fullName: "Test User",
        email: "user@example.com",
        password: "Password123",
        confirmPassword: "Different123",
      }).success,
    ).toBe(false);

    expect(
      signupFormSchema.safeParse({
        fullName: "Test User",
        email: "user@example.com",
        password: "onlyletterslongpassword",
        confirmPassword: "onlyletterslongpassword",
      }).success,
    ).toBe(false);

    expect(
      signupFormSchema.safeParse({
        fullName: "Test User",
        email: "user@example.com",
        password: "short1",
        confirmPassword: "short1",
      }).success,
    ).toBe(false);
  });

  it("maps Supabase signup & login errors to clear actionable guidance", () => {
    expect(mapSupabaseSignupError({ code: "user_already_exists" })).toMatch(/already exists/i);
    expect(mapSupabaseSignupError({ code: "weak_password" })).toMatch(/security requirements/i);
    expect(mapSupabaseSignupError({ code: "over_email_send_rate_limit", status: 429 })).toMatch(/wait a minute/i);
    expect(mapSupabaseSignupError({ message: "Database error saving new user", status: 500 })).toMatch(/migration/i);
    expect(mapSupabaseSignupError({ message: "Redirect URL not allowed" })).toMatch(/Redirect URLs/i);
    expect(mapSupabaseLoginError({ code: "email_not_confirmed" })).toMatch(/not verified yet/i);
  });

  it("resolves safe public origin and prevents stale localhost NEXT_PUBLIC_APP_URL in production", () => {
    expect(
      resolveSafeRequestOrigin({
        configuredAppUrl: "http://localhost:3000",
        forwardedHost: "app.notrealengine.com",
        forwardedProto: "https",
      }),
    ).toBe("https://app.notrealengine.com");

    expect(
      resolveSafeRequestOrigin({
        configuredAppUrl: "https://notrealengine.com/",
        forwardedHost: "evil.example",
        forwardedProto: "https",
      }),
    ).toBe("https://notrealengine.com");

    // Rejects injected/malformed host header
    expect(
      resolveSafeRequestOrigin({
        configuredAppUrl: "",
        forwardedHost: "attacker.example/evil\r\nX-Injected: 1",
        forwardedProto: "https",
      }),
    ).toBe("http://localhost:3000");
  });

  it("emits SameSite=None; Secure; Partitioned cookies on HTTPS and Lax non-secure on local HTTP", () => {
    const httpsOpts = normalizeAuthCookieOptions({ httpOnly: true }, true);
    expect(httpsOpts.sameSite).toBe("none");
    expect(httpsOpts.secure).toBe(true);
    expect(httpsOpts.partitioned).toBe(true);

    const httpOpts = normalizeAuthCookieOptions({ httpOnly: true }, false);
    expect(httpOpts.sameSite).toBe("lax");
    expect(httpOpts.secure).toBe(false);
  });

  it("enforces non-privileged self-insert and auth.uid()-bound bootstrap in migration 0010", () => {
    const sqlPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "202611210010_auth_account_provisioning_hardening.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8").toLowerCase();
    expect(sql).toContain("create policy profiles_self_insert");
    expect(sql).toContain("id = auth.uid()");
    expect(sql).toContain("is_staff = false");
    expect(sql).toContain("role is null");
    expect(sql).toContain("ensure_client_account_bootstrap");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
  });
});
