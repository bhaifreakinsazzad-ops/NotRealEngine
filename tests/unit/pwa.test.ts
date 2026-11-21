import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("PWA manifest and service worker security compliance", () => {
  it("produces a valid standalone manifest with 192, 512, and separate maskable icons", () => {
    const m = manifest();
    expect(m.id).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.short_name).toBeTruthy();
    expect((m.short_name ?? "").length).toBeLessThanOrEqual(12);
    expect(m.background_color).toBe("#05070C");
    expect(m.theme_color).toBe("#05070C");

    const icons = m.icons ?? [];
    expect(icons.some((i) => i.sizes === "192x192" && i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable")).toBe(true);

    // Verify all icon files actually exist in /public
    for (const icon of icons) {
      const absPath = path.join(process.cwd(), "public", icon.src.replace(/^\//, ""));
      expect(fs.existsSync(absPath), `Missing PWA icon file: ${icon.src}`).toBe(true);
    }
  });

  it("enforces private-route cache exclusions, auth header bypass, cache-control checks, and versioned cleanup in public/sw.js", () => {
    const swPath = path.join(process.cwd(), "public", "sw.js");
    const sw = fs.readFileSync(swPath, "utf8");

    expect(sw).toContain("nre-public-shell-v2");
    expect(sw).toContain('"/offline"');

    for (const privatePrefix of [
      '"/api/"',
      '"/dashboard"',
      '"/admin"',
      '"/login"',
      '"/signup"',
      '"/auth"',
      '"/quotes"',
      '"/orders"',
      '"/checkout"',
    ]) {
      expect(sw, `sw.js must exclude ${privatePrefix} from caching`).toContain(privatePrefix);
    }

    expect(sw).toMatch(/authorization/i);
    expect(sw).toMatch(/no-store/i);
    expect(sw).toMatch(/private/i);
    expect(sw).toContain("caches.delete");
  });
});
