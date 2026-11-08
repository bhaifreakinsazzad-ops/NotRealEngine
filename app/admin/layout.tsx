import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) { const { user } = await requireAdmin(); return <AppShell admin email={user.email}>{children}</AppShell>; }
