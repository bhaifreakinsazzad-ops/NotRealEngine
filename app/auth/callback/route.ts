import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next") || "/dashboard";
  if (code) { const supabase = await createServerSupabase(); const { error } = await supabase.auth.exchangeCodeForSession(code); if (!error) return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/dashboard", url.origin)); }
  return NextResponse.redirect(new URL("/login?error=The%20authentication%20callback%20could%20not%20be%20verified.", url.origin));
}
