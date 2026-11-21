import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

/**
 * NotRealEngine — Owner-Controlled Server-Side AI Editorial Polish Gateway (NRE LAB)
 *
 * Architectural decision (Puter.js vs Server-Side Gateway):
 * - Puter.js is NOT used because it requires client-side visitor sign-in popups and
 *   removes owner-side budget and prompt governance.
 * - Deterministic NRE LAB tools remain 100% free, login-free, and honestly labeled as
 *   deterministic v5 catalog engines.
 * - This optional server-side gateway is strictly owner-gated via `NRE_LAB_AI_ENABLED=true`
 *   and server-only `GEMINI_API_KEY`, bounded by per-IP and daily global quotas, and fails
 *   closed (HTTP 503) without fabricating fake AI responses when disabled.
 */

export const labAiEnhanceSchema = z.object({
  tool: z.enum(["scope_estimator", "launch_readiness", "landing_blueprint", "app_vs_pwa"]),
  deterministicMarkdown: z.string().trim().min(40, "Run a deterministic tool first before requesting AI polish.").max(6000),
  tone: z.enum(["executive_en", "bilingual_bn_en", "technical_spec"]).default("executive_en"),
});

export type LabAiEnhanceInput = z.infer<typeof labAiEnhanceSchema>;

const IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const IP_MAX_REQUESTS = 5;

const ipBuckets = new Map<string, number[]>();
let dailyCounter = { dateKey: "", count: 0 };

export function getLabAiGatewayStatus(env: NodeJS.ProcessEnv = process.env): {
  enabled: boolean;
  reason?: string;
  dailyLimit: number;
} {
  const enabledFlag = (env.NRE_LAB_AI_ENABLED || "").toLowerCase() === "true";
  const hasKey = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
  const parsedLimit = Number.parseInt(env.NRE_LAB_AI_DAILY_LIMIT || "100", 10);
  const dailyLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 1000) : 100;

  if (!enabledFlag) {
    return {
      enabled: false,
      reason: "Owner-controlled AI polish is currently OFF (NRE_LAB_AI_ENABLED=false). All four deterministic NRE LAB tools remain fully usable without login.",
      dailyLimit,
    };
  }
  if (!hasKey) {
    return {
      enabled: false,
      reason: "Server AI provider key is not configured. Deterministic NRE LAB output remains available.",
      dailyLimit,
    };
  }
  return { enabled: true, dailyLimit };
}

export function consumeLabAiBudget(
  ip: string,
  dailyLimit: number,
  now = Date.now(),
): { allowed: true; remainingToday: number } | { allowed: false; retryAfterSec: number; reason: string } {
  const dateKey = new Date(now).toISOString().slice(0, 10);
  if (dailyCounter.dateKey !== dateKey) {
    dailyCounter = { dateKey, count: 0 };
  }
  if (dailyCounter.count >= dailyLimit) {
    return {
      allowed: false,
      retryAfterSec: 3600,
      reason: "Daily NRE LAB AI budget limit reached. Please use the free deterministic tools or try again tomorrow.",
    };
  }

  const cutoff = now - IP_WINDOW_MS;
  const recent = (ipBuckets.get(ip) ?? []).filter((ts) => ts > cutoff);
  if (recent.length >= IP_MAX_REQUESTS) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + IP_WINDOW_MS - now) / 1000));
    ipBuckets.set(ip, recent);
    return {
      allowed: false,
      retryAfterSec,
      reason: "Per-visitor AI polish rate limit reached (5 requests/hour). Deterministic NRE LAB tools remain unrestricted.",
    };
  }

  recent.push(now);
  ipBuckets.set(ip, recent);
  dailyCounter.count += 1;

  return {
    allowed: true,
    remainingToday: Math.max(0, dailyLimit - dailyCounter.count),
  };
}

export function resetLabAiBudgetForTests() {
  ipBuckets.clear();
  dailyCounter = { dateKey: "", count: 0 };
}

export async function runOwnerGatedLabAiPolish(input: LabAiEnhanceInput): Promise<{
  polishedMarkdown: string;
  model: string;
  engine: "server-ai-gemini";
}> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Server AI provider key is not configured.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const toneDirective =
    input.tone === "bilingual_bn_en"
      ? "Provide concise executive headings in English with clear Bangla (বাংলা) explanations underneath."
      : input.tone === "technical_spec"
        ? "Format as a crisp engineering discovery note highlighting dependencies, data boundaries, and QA checkpoints."
        : "Format as a clear, concise executive brief in plain English.";

  const systemInstruction = [
    "You are an editorial assistant for NotRealEngine's NRE LAB.",
    "STRICT COMMERCIAL RULES:",
    "1. NEVER invent, alter, or discount any BDT price, service ID, add-on ID, or timeline from the supplied deterministic draft.",
    "2. Keep every price explicitly prefixed with 'Starting From' and state that formal written quotation is required.",
    "3. Never claim live automated checkout, 24/7 live human engineering, or guaranteed SEO rankings.",
    "4. Return clean Markdown only (max ~350 words).",
    toneDirective,
  ].join("\n");

  const model = "gemini-4-hydrogen";
  const response = await ai.models.generateContent({
    model,
    contents: `Refine the presentation and executive clarity of this verified deterministic NRE LAB brief without altering any service IDs, add-on IDs, or BDT Starting From numbers:\n\n${input.deterministicMarkdown}`,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("AI gateway returned an empty response.");
  }

  return {
    polishedMarkdown: text,
    model,
    engine: "server-ai-gemini",
  };
}
