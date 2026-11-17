import { describe, expect, it } from "vitest";
import { safeAuthRedirect } from "../../lib/auth-redirect";

describe("authentication return URL validation", () => {
  it("preserves authorized internal routes and query parameters", () => {
    expect(safeAuthRedirect("/admin/orders/abc?tab=details")).toBe("/admin/orders/abc?tab=details");
    expect(safeAuthRedirect("/dashboard/settings")).toBe("/dashboard/settings");
    expect(safeAuthRedirect("/reset-password")).toBe("/reset-password");
    expect(safeAuthRedirect("/quotes/123")).toBe("/quotes/123");
  });

  it.each([
    null, undefined, "", "/", "/services", "https://attacker.example",
    "//attacker.example", "/\\attacker.example", "/%2fattacker.example",
    "/%5cattacker.example", "javascript:alert(1)", "\n//attacker.example",
    "/dashboard\r\nLocation: https://attacker.example"
  ])("rejects unsafe or non-workspace destinations: %s", (destination) => {
    expect(safeAuthRedirect(destination)).toBe("/dashboard");
  });
});
