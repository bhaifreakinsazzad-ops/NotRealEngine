import Link from "next/link";
import { Brand } from "@/components/brand";
import { SocialLinks, SOCIAL_LINKS } from "@/components/social-links";
import { Phone, ExternalLink, ShieldCheck, Mail } from "lucide-react";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top-grid">
          <div className="footer-brand-col">
            <Brand />
            <p className="footer-tagline">
              Designed to impress. Engineered to work. NotRealEngine delivers structured websites,
              commerce stores, portals, web apps, mobile apps, and dependable technical care across
              Bangladesh and global teams.
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

          <div className="footer-nav-col">
            <span className="mono footer-col-title">NRE ECOSYSTEM</span>
            <nav className="footer-link-list" aria-label="Platform Links">
              <Link href="/services">NRE SELECT — 22 Services</Link>
              <Link href="/pulse">NRE PULSE — Technical Care</Link>
              <Link href="/labs">NRE LAB — Free Visitor Tools</Link>
              <Link href="/solutions">Solution Finder</Link>
              <Link href="/build">Project Builder</Link>
              <Link href="/pricing">Starting From Pricing</Link>
            </nav>
          </div>

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
                  <strong>WhatsApp (Bangladesh)</strong>
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
                  <strong>WhatsApp (US Operations)</strong>
                  <span>+1 (754) 320-2216</span>
                </div>
              </a>

              <a href="mailto:notrealenginellc@gmail.com" className="footer-channel-link">
                <Mail size={14} className="cyan" />
                <div>
                  <strong>Official Email</strong>
                  <span>notrealenginellc@gmail.com</span>
                </div>
              </a>

              <Link href="/dashboard" className="footer-channel-link portal-link">
                <ExternalLink size={14} className="cyan" />
                <div>
                  <strong>NRE OFFICE Workspace</strong>
                  <span>Projects, Files, Quotes & Support</span>
                </div>
              </Link>
            </div>
          </div>

          <div className="footer-nav-col">
            <span className="mono footer-col-title">GOVERNANCE & TRUST</span>
            <nav className="footer-link-list" aria-label="Legal & Governance">
              <Link href="/how-it-works">How It Works</Link>
              <Link href="/contact">Contact & Consultation</Link>
              <Link href="/privacy">Privacy Notice (Draft)</Link>
              <Link href="/terms">Terms of Service (Draft)</Link>
              <Link href="/refund-policy">Refund Policy (Draft)</Link>
            </nav>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="footer-legal-copy">
            <span>© {year} NotRealEngine, LLC. All rights reserved.</span>
            <span className="footer-env-tag">NRE SELECT · NRE PULSE · NRE LAB · NRE OFFICE</span>
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
