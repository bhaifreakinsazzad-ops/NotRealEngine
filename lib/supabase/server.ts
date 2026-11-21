import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { normalizeAuthCookieOptions } from "@/lib/auth-validation";

async function detectHttpsRequest(): Promise<boolean> {
  try {
    const h = await headers();
    const proto = (h.get("x-forwarded-proto") || "").split(",")[0]?.trim().toLowerCase();
    if (proto === "https") return true;
    if (proto === "http") return false;
    const host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();
    if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
      return true;
    }
  } catch {
    // Fallback to configured URL protocol outside request context
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "").toLowerCase().startsWith("https://");
}

export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  const [store, isHttps] = await Promise.all([cookies(), detectHttpsRequest()]);
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) =>
            store.set(name, value, normalizeAuthCookieOptions(options, isHttps)),
          );
        } catch {
          /* Server Components cannot always write cookies; proxy refreshes them. */
        }
      },
    },
  });
}
