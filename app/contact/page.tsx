import { Phone, ExternalLink, QrCode } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { BookingCalendar } from "@/components/booking-calendar";
import { OnboardingForm } from "@/components/onboarding-form";
import { SocialLinks, SOCIAL_LINKS } from "@/components/social-links";

export default function ContactPage() {
  return (
    <MarketingShell>
      {/* Page Hero */}
      <section className="page-hero">
        <div className="shell">
          <div className="hero-pill">
            <Phone size={14} className="cyan" />
            <span>DIRECT ACCESS DESK</span>
          </div>
          <h1>Connect directly with our engineering triage desk.</h1>
          <p>
            Whether you need architectural scoping, a commercial quotation, or immediate direct messaging, reach our team across verified channels.
          </p>
        </div>
      </section>

      {/* Main Channels Grid */}
      <section className="section">
        <div className="shell">
          <div className="contact-channels-grid">
            {/* WhatsApp Global / BD */}
            <a
              href={SOCIAL_LINKS.whatsappBD}
              target="_blank"
              rel="noopener noreferrer"
              className="channel-card active-channel"
            >
              <div className="channel-icon-wrap green">
                <Phone size={24} />
              </div>
              <div className="channel-info">
                <span className="channel-meta mono">INSTANT MESSAGING // BD</span>
                <h3>WhatsApp Direct</h3>
                <p>Chat directly with our lead technical triage engineers.</p>
                <span className="channel-action">
                  +880 1778-307704 <ExternalLink size={14} />
                </span>
              </div>
            </a>

            {/* WhatsApp US */}
            <a
              href={SOCIAL_LINKS.whatsappUS}
              target="_blank"
              rel="noopener noreferrer"
              className="channel-card"
            >
              <div className="channel-icon-wrap green">
                <Phone size={24} />
              </div>
              <div className="channel-info">
                <span className="channel-meta mono">INSTANT MESSAGING // US</span>
                <h3>WhatsApp US Ops</h3>
                <p>Direct line for United States & international corporate clients.</p>
                <span className="channel-action">
                  +1 (754) 320-2216 <ExternalLink size={14} />
                </span>
              </div>
            </a>

            {/* Client Portal */}
            <a
              href={SOCIAL_LINKS.clientPortal}
              target="_blank"
              rel="noopener noreferrer"
              className="channel-card portal-card"
            >
              <div className="channel-icon-wrap gold">
                <ExternalLink size={24} />
              </div>
              <div className="channel-info">
                <span className="channel-meta mono">SECURE CLIENT WORKSPACE</span>
                <h3>Client Portal</h3>
                <p>Access your active projects, deliverables, milestones, and invoices.</p>
                <span className="channel-action gold">
                  clientportal.notrealengine.online <ExternalLink size={14} />
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Embedded Live Booking Calendar */}
      <section className="section section-dark" id="book">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">LIVE DISCOVERY CALLS</div>
              <h2>Schedule an Engineering Briefing</h2>
            </div>
            <p>
              Lock in a 30-minute discovery session with our technical team to discuss architecture, timelines, and commercial parameters.
            </p>
          </div>

          <BookingCalendar />
        </div>
      </section>

      {/* Fast-Track Onboarding Form */}
      <section className="section" id="onboard">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">STRUCTURED QUESTIONNAIRE</div>
              <h2>Fast-Track Client Onboarding</h2>
            </div>
            <p>
              Prefer submitting your requirements in writing? Fill out our structured questionnaire for 24-hour evaluation.
            </p>
          </div>

          <OnboardingForm inline />
        </div>
      </section>

      {/* Meta Portfolio & Verification Identity */}
      <section className="section section-dark">
        <div className="shell">
          <div className="meta-verification-panel">
            <div className="meta-info-left">
              <div className="section-code">IDENTITY & CORPORATE VERIFICATION</div>
              <h3>NOTREAL ENGINE, LLC · Verified Meta Portfolio</h3>
              <p>
                Our business portfolio and administrative credentials are cryptographically verified with Meta Business.
              </p>
              <div className="meta-attributes-list">
                <div className="meta-attr">
                  <span className="mono">Meta Portfolio ID:</span>
                  <strong>{SOCIAL_LINKS.metaPortfolioId}</strong>
                </div>
                <div className="meta-attr">
                  <span className="mono">Verified Admin:</span>
                  <a
                    href={SOCIAL_LINKS.metaProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cyan inline-flex items-center gap-1"
                  >
                    <span>mericanbhaisazzad</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </div>

            <div className="meta-qr-right">
              <div className="qr-badge">
                <QrCode size={20} className="cyan" />
                <span>ADMIN QR ACCESS</span>
              </div>
              <p className="qr-caption">Scan or click to verify admin access credentials:</p>
              <a
                href={SOCIAL_LINKS.metaQrAccess}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary qr-link-btn"
              >
                <span>Open Verification QR</span>
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Social Footprint */}
      <section className="section">
        <div className="shell">
          <div className="social-footprint-wrap">
            <div>
              <h3>Follow Our Engineering Updates</h3>
              <p>Follow NOTREAL ENGINE on social media for technical releases, build logs, and project breakdowns.</p>
            </div>
            <SocialLinks className="large-social-links" />
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
