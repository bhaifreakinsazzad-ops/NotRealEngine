import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader /><main id="main">{children}</main><SiteFooter /></>;
}
