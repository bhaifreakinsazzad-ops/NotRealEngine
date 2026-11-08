import Link from "next/link";
import { Brand } from "@/components/brand";
import { logout } from "@/app/auth/actions";

const clientLinks = [["Overview","/dashboard"],["Projects","/dashboard/projects"],["Orders","/dashboard/orders"],["Billing","/dashboard/billing"],["Support","/dashboard/support"],["Settings","/dashboard/settings"]] as const;
const adminLinks = [["Overview","/admin"],["Leads","/admin/leads"],["Quotes","/admin/quotes"],["Orders","/admin/orders"],["Projects","/admin/projects"],["Clients","/admin/clients"],["Services","/admin/services"],["Pricing","/admin/pricing"],["Payments","/admin/payments"],["Support","/admin/support"],["Settings","/admin/settings"]] as const;

export function AppShell({ children, admin = false, email }: { children: React.ReactNode; admin?: boolean; email?: string }) {
  const links = admin ? adminLinks : clientLinks;
  return <div className="app-shell"><aside className="app-sidebar"><Link href={admin ? "/admin" : "/dashboard"}><Brand operations={admin} /></Link><nav className="app-nav" aria-label={admin ? "Operations navigation" : "Workspace navigation"}>{links.map(([label, href]) => <Link key={href} href={href}><span>{label}</span></Link>)}</nav></aside><main id="main" className="app-content"><div className="app-top"><div><span className="mono cyan">{admin ? "AUTHORIZED OPERATIONS" : "VERIFIED WORKSPACE"}</span><h1>{admin ? "Operations Control Center" : "Client Workspace"}</h1></div><form action={logout}><span className="muted" style={{ marginRight: ".8rem", fontSize: ".8rem" }}>{email}</span><button className="btn" type="submit">Sign out</button></form></div>{children}</main></div>;
}
