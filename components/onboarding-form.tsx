"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";

interface OnboardingFormProps {
  inline?: boolean;
}

export function OnboardingForm({ inline = false }: OnboardingFormProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as { init_form_embed?: () => void }).init_form_embed) {
      (window as unknown as { init_form_embed: () => void }).init_form_embed();
    }
  }, [loaded]);

  return (
    <div className={`onboarding-form-card ${inline ? "inline-form" : ""}`}>
      <div className="onboarding-head">
        <div className="onboarding-badge">
          <Sparkles size={16} className="cyan" />
          <span>FAST-TRACK CLIENT ONBOARDING</span>
        </div>
        <h2>Project Intake & Discovery Questionnaire</h2>
        <p>
          Submit your requirements directly to our engineering triage desk. Once submitted, an auditable specification and quotation draft will be assembled.
        </p>
      </div>

      <div className="onboarding-benefits">
        <div className="benefit-item">
          <CheckCircle2 size={16} className="cyan" />
          <span>Direct intake into ENGINE//OS Ops pipeline</span>
        </div>
        <div className="benefit-item">
          <CheckCircle2 size={16} className="cyan" />
          <span>Intake reviewed by technical triage desk</span>
        </div>
        <div className="benefit-item">
          <ShieldCheck size={16} className="gold" />
          <span>Structured scope & requirements collection</span>
        </div>
      </div>

      <div className="onboarding-iframe-container">
        <iframe
          src="https://api.leadconnectorhq.com/widget/form/xG6QfUlNSvL8dvk47yf3"
          style={{ width: "100%", height: "100%", border: "none", borderRadius: "6px", minHeight: "600px" }}
          id="onboarding-form-iframe-xG6QfUlNSvL8dvk47yf3"
          data-layout="{'id':'DEFAULT'}"
          data-form-name="Onboarding Form 1.0"
          data-form-id="xG6QfUlNSvL8dvk47yf3"
          data-cookie-consent="true"
          data-cookie-consent-provider="auto"
          title="Onboarding Form 1.0"
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
