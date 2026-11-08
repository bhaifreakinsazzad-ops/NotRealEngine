import Link from "next/link";
import { Brand } from "@/components/brand";
import { SocialLinks, SOCIAL_LINKS } from "@/components/social-links";
import { Phone, ExternalLink, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top-grid">
          {/* Brand & Mission Column */}
          <div className="footer-brand-col">
            <Brand />
            <p className="footer-tagline">
              Digital engineering, configured around your business. High-performance web applications, progressive systems, and mission-critical cloud infrastructure.
            </p>
            <div className="footer-meta-badge">
              <ShieldCheck size={14} className="cyan" />
              <span>Meta Portfolio ID: {SOCIAL_LINKS.metaPortfolioId}</span>
            </div>
            <div className="footer-social-wrap">
              <span className="mono footer-label">CONNECT WITH US</span>
              <SocialLinks />
            </div>
          </div>

          {/* Canonical Services Column */}
          <div className="footer-nav-col">
            <span className="mono footer-col-title">CANONICAL PLATFORM</span>
            <nav className="footer-link-list" aria-label="Platform Links">
              <Link href="/services">12 Canonical Offers</Link>
              <Link href="/solutions">Rules-Based Finder</Link>
              <Link href="/build">Project Intake Builder</Link>
              <Link href="/how-it-works">Operating Flow</Link>
              <Link href="/labs">Engine Visual Pipeline</Link>
              <Link href="/pricing">Commercial Registry</Link>
            </nav>
          </div>

          {/* Communications & Support Column */}
          <div className="footer-nav-col">
            <span className="mono footer-col-title">DIRECT CHANNELS</span>
            <div className="footer-channel-list">
              <a
                href={SOCIAL_LINKS.whatsappBD}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-channel-link"
              >
                <Phone size={14} className="cyan" />
                <div>
                  <strong>WhatsApp (Direct)</strong>
                  <span>+880 1778-307704</span>
                </div>
              </a>

              <a
                href={SOCIAL_LINKS.whatsappUS}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-channel-link"
              >
                <Phone size={14} className="cyan" />
                <div>
                  <strong>WhatsApp (US Ops)</strong>
                  <span>+1 (754) 320-2216</span>
                </div>
              </a>

              <a
                href={SOCIAL_LINKS.clientPortal}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-channel-link portal-link"
              >
                <ExternalLink size={14} className="gold" />
                <div>
                  <strong>Client Portal</strong>
                  <span>clientportal.notrealengine.online</span>
                </div>
              </a>
            </div>
          </div>

          {/* Compliance & Operations Column */}
          <div className="footer-nav-col">
            <span className="mono footer-col-title">GOVERNANCE & TRUST</span>
            <nav className="footer-link-list" aria-label="Legal & Governance">
              <Link href="/contact">Direct Contact & Consultation</Link>
              <Link href="/privacy">Privacy Notice (Draft)</Link>
              <Link href="/terms">Terms of Service (Draft)</Link>
              <Link href="/refund-policy">Refund Policy (Draft)</Link>
              <a
                href={SOCIAL_LINKS.metaProfile}
                target="_blank"
                rel="noopener noreferrer"
                className="external-audit-link"
              >
                <span>Meta Verified Identity</span>
                <ExternalLink size={12} />
              </a>
            </nav>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-legal-copy">
            <span>© {year} NOTREAL ENGINE, LLC. All rights reserved.</span>
            <span className="footer-env-tag">ENGINE//OS · STAGING V13.0 ACTIVE</span>
          </div>
          <div className="footer-bottom-links">
            <Link href="/privacy">Privacy</Link>
            <span className="dot-sep">·</span>
            <Link href="/terms">Terms</Link>
            <span className="dot-sep">·</span>
            <Link href="/refund-policy">Refunds</Link>
            <span className="dot-sep">·</span>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
