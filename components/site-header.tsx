"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { PWAInstallButton } from "@/components/pwa-controls";

const links = [
  ["Services", "/services"],
  ["Solutions", "/solutions"],
  ["PULSE", "/pulse"],
  ["Labs", "/labs"],
  ["Pricing", "/pricing"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link href="/" className="header-brand-link" aria-label="NotRealEngine Home">
          <Brand />
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href || pathname?.startsWith(`${href}/`) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <PWAInstallButton />
          <Link
            href="/dashboard"
            className="btn btn-quiet portal-btn"
            title="Open NRE OFFICE Client Workspace"
          >
            <span>Workspace</span>
            <ExternalLink size={14} className="cyan" />
          </Link>
          <Link className="btn btn-quiet" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-primary" href="/build">
            Start a project
          </Link>
          <button
            type="button"
            className="btn btn-quiet mobile-menu"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link href="/build" onClick={() => setOpen(false)} style={{ color: "var(--cyan)", fontWeight: 700 }}>
            Start a project
          </Link>
          <Link
            href="/dashboard"
            className="mobile-portal-link"
            onClick={() => setOpen(false)}
          >
            <span>NRE OFFICE Workspace</span>
            <ExternalLink size={14} className="cyan" />
          </Link>
          <Link href="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
