"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Calendar, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

interface BookingCalendarProps {
  compact?: boolean;
}

export function BookingCalendar({ compact = false }: BookingCalendarProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // If the msgsndr script is already loaded on the page, trigger height recalculation
    if (typeof window !== "undefined" && (window as unknown as { init_form_embed?: () => void }).init_form_embed) {
      (window as unknown as { init_form_embed: () => void }).init_form_embed();
    }
  }, [loaded]);

  return (
    <div className={`booking-calendar-card ${compact ? "compact" : ""}`}>
      <div className="booking-head">
        <div className="booking-badge">
          <Calendar size={16} className="cyan" />
          <span>SCHEDULE LIVE CONSULTATION</span>
        </div>
        <h3>Book an Engineering Briefing</h3>
        <p>
          Select a time with our technical leads to scope requirements, architecture, and timeline for your digital product.
        </p>
      </div>

      <div className="booking-perks">
        <div className="perk">
          <Clock size={15} className="cyan" />
          <span>30-Min Discovery Session</span>
        </div>
        <div className="perk">
          <CheckCircle2 size={15} className="cyan" />
          <span>Technical Discovery Session</span>
        </div>
        <div className="perk">
          <ShieldAlert size={15} className="gold" />
          <span>NDA Protection Available on Request</span>
        </div>
      </div>

      <div className="booking-iframe-wrap">
        <iframe
          src="https://api.leadconnectorhq.com/widget/booking/vGr1Fk7WPHKhT7b2Fnrg"
          allow="payment"
          style={{ width: "100%", border: "none", overflow: "hidden", minHeight: "680px" }}
          scrolling="no"
          id="vGr1Fk7WPHKhT7b2Fnrg_1790190517352"
          title="NOTREAL ENGINE Engineering Consultation Booking"
          onLoad={() => setLoaded(true)}
        />
        <Script
          src="https://link.msgsndr.com/js/form_embed.js"
          strategy="lazyOnload"
        />
      </div>
    </div>
  );
}
