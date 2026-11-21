import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  consumeLabAiBudget,
  getLabAiGatewayStatus,
  resetLabAiBudgetForTests,
} from "@/lib/lab-ai-gateway";
import { GET, POST } from "@/app/api/lab/enhance/route";

describe("NRE LAB owner-controlled server AI gateway", () => {
  beforeEach(() => {
    resetLabAiBudgetForTests();
  });

  it("fails closed when NRE_LAB_AI_ENABLED is false or GEMINI_API_KEY is absent", () => {
    const offStatus = getLabAiGatewayStatus({ NODE_ENV: "test", NRE_LAB_AI_ENABLED: "false", GEMINI_API_KEY: "test-key" });
    expect(offStatus.enabled).toBe(false);

    const noKeyStatus = getLabAiGatewayStatus({ NODE_ENV: "test", NRE_LAB_AI_ENABLED: "true" });
    expect(noKeyStatus.enabled).toBe(false);

    const enabledStatus = getLabAiGatewayStatus({
      NODE_ENV: "test",
      NRE_LAB_AI_ENABLED: "true",
      GEMINI_API_KEY: "server-secret",
      NRE_LAB_AI_DAILY_LIMIT: "42",
    });
    expect(enabledStatus.enabled).toBe(true);
    expect(enabledStatus.dailyLimit).toBe(42);
  });

  it("enforces per-IP hourly limit (5) and global daily budget cap", () => {
    const now = Date.UTC(2026, 10, 21, 12, 0, 0);
    for (let i = 0; i < 5; i++) {
      const r = consumeLabAiBudget("203.0.113.10", 10, now + i * 1000);
      expect(r.allowed).toBe(true);
    }
    const sixth = consumeLabAiBudget("203.0.113.10", 10, now + 6000);
    expect(sixth.allowed).toBe(false);

    // Different IP still works until daily cap is reached
    for (let i = 0; i < 5; i++) {
      const r = consumeLabAiBudget("203.0.113.11", 10, now + i * 1000);
      expect(r.allowed).toBe(true);
    }
    const eleventh = consumeLabAiBudget("203.0.113.12", 10, now + 7000);
    expect(eleventh.allowed).toBe(false);
  });

  it("returns deterministic-only status on GET and HTTP 503 on POST when owner switch is off", async () => {
    const prevFlag = process.env.NRE_LAB_AI_ENABLED;
    delete process.env.NRE_LAB_AI_ENABLED;

    try {
      const getRes = await GET();
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.enabled).toBe(false);
      expect(getJson.engine).toBe("deterministic-only");

      const postReq = new NextRequest("http://localhost:3000/api/lab/enhance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: "scope_estimator",
          deterministicMarkdown: "A".repeat(60),
          tone: "executive_en",
        }),
      });
      const postRes = await POST(postReq);
      expect(postRes.status).toBe(503);
    } finally {
      if (prevFlag !== undefined) process.env.NRE_LAB_AI_ENABLED = prevFlag;
    }
  });
});
