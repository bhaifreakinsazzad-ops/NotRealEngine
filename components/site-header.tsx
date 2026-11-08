"use client";

import Link from "next/link";
import { Menu, X, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/brand";

const links = [
  ["Services", "/services"],
  ["Solutions", "/solutions"],
  ["How it works", "/how-it-works"],
  ["Labs", "/labs"],
  ["Pricing", "/pricing"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link href="/" className="header-brand-link" aria-label="NOTREAL ENGINE Home">
          <Brand />
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            href="/dashboard"
            className="btn btn-quiet portal-btn"
            title="Open ENGINE//OS Client Workspace"
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
          <Link
            href="/dashboard"
            className="mobile-portal-link"
            onClick={() => setOpen(false)}
          >
            <span>Client Workspace</span>
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
