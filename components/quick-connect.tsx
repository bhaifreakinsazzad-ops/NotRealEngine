"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Phone, Calendar, Sparkles, ExternalLink, X } from "lucide-react";
import { SOCIAL_LINKS } from "./social-links";
import { BookingCalendar } from "./booking-calendar";
import { OnboardingForm } from "./onboarding-form";

export function QuickConnect() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"calendar" | "onboarding" | null>(null);

  return (
    <>
      {/* Floating Speed-Dial Trigger */}
      <div className="quick-connect-container">
        {isOpen && (
          <div className="quick-connect-menu" role="menu" aria-label="Direct Communication Channels">
            <div className="quick-connect-header">
              <span className="mono">CHANNELS // DIRECT</span>
            </div>

            <a
              href={SOCIAL_LINKS.whatsappBD}
              target="_blank"
              rel="noopener noreferrer"
              className="quick-menu-item"
              role="menuitem"
            >
              <div className="item-icon-box green">
                <Phone size={16} />
              </div>
              <div className="item-text">
                <strong>WhatsApp Direct (BD)</strong>
                <span>+880 1778-307704</span>
              </div>
            </a>

            <a
              href={SOCIAL_LINKS.whatsappUS}
              target="_blank"
              rel="noopener noreferrer"
              className="quick-menu-item"
              role="menuitem"
            >
              <div className="item-icon-box green">
                <Phone size={16} />
              </div>
              <div className="item-text">
                <strong>WhatsApp US Ops</strong>
                <span>+1 (754) 320-2216</span>
              </div>
            </a>

            <button
              type="button"
              className="quick-menu-item"
              onClick={() => {
                setActiveModal("calendar");
                setIsOpen(false);
              }}
              role="menuitem"
            >
              <div className="item-icon-box cyan">
                <Calendar size={16} />
              </div>
              <div className="item-text">
                <strong>Book Consultation</strong>
                <span>Schedule live video brief</span>
              </div>
            </button>

            <button
              type="button"
              className="quick-menu-item"
              onClick={() => {
                setActiveModal("onboarding");
                setIsOpen(false);
              }}
              role="menuitem"
            >
              <div className="item-icon-box gold">
                <Sparkles size={16} />
              </div>
              <div className="item-text">
                <strong>Fast-Track Onboarding</strong>
                <span>Direct intake questionnaire</span>
              </div>
            </button>

            <Link
              href="/dashboard"
              className="quick-menu-item portal-item"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <div className="item-icon-box silver">
                <ExternalLink size={16} />
              </div>
              <div className="item-text">
                <strong>Client Workspace</strong>
                <span>ENGINE//OS Projects & Invoices</span>
              </div>
            </Link>
          </div>
        )}

        <button
          type="button"
          className={`quick-connect-fab ${isOpen ? "active" : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Close communication channels" : "Open instant communication channels"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
          <span className="fab-ping" aria-hidden="true" />
        </button>
      </div>

      {/* Booking Calendar Modal */}
      {activeModal === "calendar" && (
        <div className="interactive-modal-backdrop" role="dialog" aria-modal="true" aria-label="Schedule Consultation">
          <div className="interactive-modal-content">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setActiveModal(null)}
              aria-label="Close booking modal"
            >
              <X size={20} />
            </button>
            <BookingCalendar />
          </div>
        </div>
      )}

      {/* Onboarding Form Modal */}
      {activeModal === "onboarding" && (
        <div className="interactive-modal-backdrop" role="dialog" aria-modal="true" aria-label="Client Onboarding">
          <div className="interactive-modal-content">
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setActiveModal(null)}
              aria-label="Close onboarding modal"
            >
              <X size={20} />
            </button>
            <OnboardingForm />
          </div>
        </div>
      )}
    </>
  );
}
