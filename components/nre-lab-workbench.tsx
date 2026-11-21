"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  ClipboardCheck,
  LayoutTemplate,
  Smartphone,
  Copy,
  Download,
  Check,
  ArrowRight,
  Play,
} from "lucide-react";
import { formatStartingFromBdt, serviceById, services } from "@/lib/catalog";
import type { LabToolResult } from "@/lib/lab-tools";

type ToolTab = "scope_estimator" | "launch_readiness" | "landing_blueprint" | "app_vs_pwa";

const TOOL_TABS: readonly { id: ToolTab; label: string; Icon: typeof Calculator }[] = [
  { id: "scope_estimator", label: "Scope & Add-On Estimator", Icon: Calculator },
  { id: "launch_readiness", label: "Launch Readiness Checklist", Icon: ClipboardCheck },
  { id: "landing_blueprint", label: "Landing Page Blueprint", Icon: LayoutTemplate },
  { id: "app_vs_pwa", label: "App vs PWA Advisor", Icon: Smartphone },
];

export function NreLabWorkbench() {
  const [activeTab, setActiveTab] = useState<ToolTab>("scope_estimator");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LabToolResult | null>(null);
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [copied, setCopied] = useState(false);

  // Tool 1: Scope Estimator state
  const [serviceId, setServiceId] = useState("S02");
  const [addonIds, setAddonIds] = useState<string[]>(["A03", "A13"]);
  const [estBusiness, setEstBusiness] = useState("");
  const [estGoal, setEstGoal] = useState("");

  // Tool 2: Launch Readiness state
  const [siteUrl, setSiteUrl] = useState("");
  const [checks, setChecks] = useState({
    hasCustomDomainSsl: true,
    mobileResponsiveVerified: false,
    clearPrimaryCta: true,
    seoMetadataReady: false,
    fastCoreLoad: true,
    backupAndSecurityPlan: false,
    banglaOrTargetCopyReady: true,
    contactAndTrackingTested: false,
  });

  // Tool 3: Landing Blueprint state
  const [bpBusiness, setBpBusiness] = useState("Dhaka Craft Studio");
  const [bpAudience, setBpAudience] = useState("Local retail founders and online shoppers");
  const [bpOffer, setBpOffer] = useState("Custom brand identity and e-commerce storefront setup");
  const [bpLanguage, setBpLanguage] = useState<"en" | "bn" | "bilingual">("bilingual");
  const [bpCta, setBpCta] = useState("Request a Quotation");

  // Tool 4: App vs PWA Advisor state
  const [needsOfflineUse, setNeedsOfflineUse] = useState(true);
  const [needsAppStorePresence, setNeedsAppStorePresence] = useState(false);
  const [needsNativeDeviceApis, setNeedsNativeDeviceApis] = useState(false);
  const [primaryAudience, setPrimaryAudience] = useState<"android_first" | "ios_first" | "both_mobile" | "web_and_mobile">("web_and_mobile");
  const [budgetPriority, setBudgetPriority] = useState<"lean_launch" | "balanced" | "native_investment">("lean_launch");

  const selectedService = useMemo(() => serviceById(serviceId), [serviceId]);

  async function executeTool(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    let body: Record<string, unknown>;
    if (activeTab === "scope_estimator") {
      body = {
        tool: "scope_estimator",
        serviceId,
        addonIds,
        businessName: estBusiness,
        goalSummary: estGoal,
      };
    } else if (activeTab === "launch_readiness") {
      body = {
        tool: "launch_readiness",
        siteUrl,
        checks,
      };
    } else if (activeTab === "landing_blueprint") {
      body = {
        tool: "landing_blueprint",
        businessName: bpBusiness,
        targetAudience: bpAudience,
        coreOffer: bpOffer,
        language: bpLanguage,
        primaryCta: bpCta,
      };
    } else {
      body = {
        tool: "app_vs_pwa",
        needsOfflineUse,
        needsAppStorePresence,
        needsNativeDeviceApis,
        primaryAudience,
        budgetPriority,
      };
    }

    try {
      const res = await fetch("/api/lab/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not run NRE LAB tool.");
      setResult(data as LabToolResult);
      setEditableMarkdown(data.markdown);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tool execution failed.");
    } finally {
      setLoading(false);
    }
  }

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function copyOutput() {
    if (!editableMarkdown) return;
    try {
      await navigator.clipboard.writeText(editableMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard unavailable; use Download .md instead.");
    }
  }

  function downloadOutput() {
    if (!editableMarkdown) return;
    const blob = new Blob([editableMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nre-lab-${activeTab}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="lab-tabs" role="tablist" aria-label="NRE LAB Free Tools">
        {TOOL_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`segment-tab${activeTab === id ? " active" : ""}`}
            onClick={() => {
              setActiveTab(id);
              setError("");
            }}
          >
            <Icon size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
            {label}
          </button>
        ))}
      </div>

      <div className="lab-workbench-grid">
        {/* LEFT: INPUT FORM */}
        <form className="lab-panel" onSubmit={executeTool}>
          <div className="section-code">FREE VISITOR UTILITY · NO LOGIN REQUIRED</div>

          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}

          {activeTab === "scope_estimator" && (
            <>
              <h2 style={{ margin: "0 0 .45rem", fontSize: "1.35rem" }}>
                Starting-Scope & Add-On Estimator
              </h2>
              <p className="muted" style={{ margin: "0 0 1.25rem", fontSize: ".88rem" }}>
                Pick any canonical v5 service and compatible add-ons to produce a free editable
                scope brief with BDT Starting From baselines.
              </p>

              <div className="field">
                <label htmlFor="lab-service">Canonical v5 Service</label>
                <select
                  id="lab-service"
                  className="select"
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    setAddonIds([]);
                  }}
                >
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.id} — {svc.name} ({formatStartingFromBdt(svc.startingPriceBdt)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedService && selectedService.addons.length > 0 && (
                <div className="field">
                  <label>Compatible Add-ons ({selectedService.addons.length})</label>
                  <div style={{ display: "grid", gap: ".5rem" }}>
                    {selectedService.addons.map((addon) => (
                      <label
                        key={addon.id}
                        className="addon-option"
                        style={{ padding: ".65rem .8rem" }}
                      >
                        <input
                          type="checkbox"
                          checked={addonIds.includes(addon.id)}
                          onChange={() => toggleAddon(addon.id)}
                        />
                        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: ".85rem" }}>
                            <strong className="mono cyan" style={{ display: "inline", marginRight: 6 }}>{addon.id}</strong>
                            {addon.label}
                          </span>
                          <span className="mono tabular muted" style={{ fontSize: ".76rem" }}>
                            +{formatStartingFromBdt(addon.startingPriceBdt)}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="field">
                <label htmlFor="lab-biz">Business / project name (optional)</label>
                <input
                  id="lab-biz"
                  className="input"
                  value={estBusiness}
                  onChange={(e) => setEstBusiness(e.target.value)}
                  placeholder="e.g. Bengal Logistics Portal"
                />
              </div>

              <div className="field">
                <label htmlFor="lab-goal">Primary business objective (optional)</label>
                <textarea
                  id="lab-goal"
                  className="textarea"
                  style={{ minHeight: 84 }}
                  value={estGoal}
                  onChange={(e) => setEstGoal(e.target.value)}
                  placeholder="Briefly describe what you want to achieve..."
                />
              </div>
            </>
          )}

          {activeTab === "launch_readiness" && (
            <>
              <h2 style={{ margin: "0 0 .45rem", fontSize: "1.35rem" }}>
                Website & Launch Readiness Checklist
              </h2>
              <p className="muted" style={{ margin: "0 0 1.25rem", fontSize: ".88rem" }}>
                Check what you have already verified on your site to get an honest score and clear
                pre-launch action list.
              </p>

              <div className="field">
                <label htmlFor="lab-url">Website or project label (optional)</label>
                <input
                  id="lab-url"
                  className="input"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="e.g. yourbrand.com"
                />
              </div>

              <div style={{ display: "grid", gap: ".5rem", marginBottom: "1rem" }}>
                {(
                  [
                    ["hasCustomDomainSsl", "Custom domain, DNS & HTTPS/SSL configured"],
                    ["mobileResponsiveVerified", "Verified responsive layout down to 320px width"],
                    ["clearPrimaryCta", "Clear above-the-fold headline & primary CTA"],
                    ["seoMetadataReady", "SEO titles, descriptions, OpenGraph & schema ready"],
                    ["fastCoreLoad", "Images compressed and fast first load checked"],
                    ["backupAndSecurityPlan", "Automated backups & security monitoring in place"],
                    ["banglaOrTargetCopyReady", "Final English/Bangla copy proofread"],
                    ["contactAndTrackingTested", "Forms & WhatsApp contact routes tested end-to-end"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="addon-option" style={{ padding: ".65rem .8rem" }}>
                    <input
                      type="checkbox"
                      checked={checks[key]}
                      onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                    />
                    <span style={{ fontSize: ".86rem" }}>{label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {activeTab === "landing_blueprint" && (
            <>
              <h2 style={{ margin: "0 0 .45rem", fontSize: "1.35rem" }}>
                Landing Page Blueprint Generator
              </h2>
              <p className="muted" style={{ margin: "0 0 1.25rem", fontSize: ".88rem" }}>
                Generate a structured 5-section conversion outline for English, Bangla, or bilingual
                campaigns.
              </p>

              <div className="field">
                <label htmlFor="bp-biz">Brand / business name</label>
                <input
                  id="bp-biz"
                  className="input"
                  required
                  value={bpBusiness}
                  onChange={(e) => setBpBusiness(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="bp-aud">Target audience</label>
                <input
                  id="bp-aud"
                  className="input"
                  required
                  value={bpAudience}
                  onChange={(e) => setBpAudience(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="bp-offer">Core offer or value proposition</label>
                <textarea
                  id="bp-offer"
                  className="textarea"
                  style={{ minHeight: 84 }}
                  required
                  value={bpOffer}
                  onChange={(e) => setBpOffer(e.target.value)}
                />
              </div>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="bp-lang">Language</label>
                  <select
                    id="bp-lang"
                    className="select"
                    value={bpLanguage}
                    onChange={(e) => setBpLanguage(e.target.value as "en" | "bn" | "bilingual")}
                  >
                    <option value="en">English</option>
                    <option value="bn">Bangla (বাংলা)</option>
                    <option value="bilingual">Bilingual (English + Bangla)</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="bp-cta">Primary CTA label</label>
                  <input
                    id="bp-cta"
                    className="input"
                    value={bpCta}
                    onChange={(e) => setBpCta(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "app_vs_pwa" && (
            <>
              <h2 style={{ margin: "0 0 .45rem", fontSize: "1.35rem" }}>
                Web App vs PWA vs Native Mobile Advisor
              </h2>
              <p className="muted" style={{ margin: "0 0 1.25rem", fontSize: ".88rem" }}>
                Compare S08 Web App, S09 Progressive Web App, S10 Android App, and S11 iOS App
                honestly before committing budget.
              </p>

              <div style={{ display: "grid", gap: ".5rem", marginBottom: "1rem" }}>
                <label className="addon-option" style={{ padding: ".65rem .8rem" }}>
                  <input
                    type="checkbox"
                    checked={needsOfflineUse}
                    onChange={(e) => setNeedsOfflineUse(e.target.checked)}
                  />
                  <span style={{ fontSize: ".86rem" }}>Users need home-screen install or offline resilience</span>
                </label>
                <label className="addon-option" style={{ padding: ".65rem .8rem" }}>
                  <input
                    type="checkbox"
                    checked={needsAppStorePresence}
                    onChange={(e) => setNeedsAppStorePresence(e.target.checked)}
                  />
                  <span style={{ fontSize: ".86rem" }}>Official Google Play / Apple App Store listing is mandatory</span>
                </label>
                <label className="addon-option" style={{ padding: ".65rem .8rem" }}>
                  <input
                    type="checkbox"
                    checked={needsNativeDeviceApis}
                    onChange={(e) => setNeedsNativeDeviceApis(e.target.checked)}
                  />
                  <span style={{ fontSize: ".86rem" }}>Deep native hardware APIs required (Bluetooth, background GPS, etc.)</span>
                </label>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="adv-aud">Primary platform audience</label>
                  <select
                    id="adv-aud"
                    className="select"
                    value={primaryAudience}
                    onChange={(e) =>
                      setPrimaryAudience(
                        e.target.value as "android_first" | "ios_first" | "both_mobile" | "web_and_mobile"
                      )
                    }
                  >
                    <option value="web_and_mobile">Web + Mobile mixed</option>
                    <option value="android_first">Android-first (Bangladesh / emerging)</option>
                    <option value="ios_first">iOS-first</option>
                    <option value="both_mobile">Both Android & iOS</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="adv-budget">Budget & speed priority</label>
                  <select
                    id="adv-budget"
                    className="select"
                    value={budgetPriority}
                    onChange={(e) =>
                      setBudgetPriority(e.target.value as "lean_launch" | "balanced" | "native_investment")
                    }
                  >
                    <option value="lean_launch">Lean fast launch</option>
                    <option value="balanced">Balanced long-term web/app</option>
                    <option value="native_investment">Dedicated native investment</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: ".5rem" }}>
            <Play size={15} />
            <span>{loading ? "Generating..." : "Generate Structured Output"}</span>
          </button>
        </form>

        {/* RIGHT: EDITABLE OUTPUT & BUILDER HANDOFF */}
        <div className="lab-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div className="section-code" style={{ margin: 0 }}>
              {result ? `RESULT · ${result.engine.toUpperCase()}` : "OUTPUT WORKSPACE"}
            </div>
            {result && (
              <div style={{ display: "flex", gap: ".45rem" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ minHeight: 34, padding: ".35rem .65rem", fontSize: ".75rem" }}
                  onClick={copyOutput}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ minHeight: 34, padding: ".35rem .65rem", fontSize: ".75rem" }}
                  onClick={downloadOutput}
                >
                  <Download size={13} />
                  <span>.md</span>
                </button>
              </div>
            )}
          </div>

          {!result ? (
            <div className="empty" style={{ minHeight: 320 }}>
              <div>
                <strong>Instant, editable engineering output</strong>
                <p style={{ margin: 0, maxWidth: 340, lineHeight: 1.55 }}>
                  Configure the inputs on the left and run the tool to generate a structured brief
                  you can edit, download, or send directly into the Project Builder.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: "0 0 .35rem", fontSize: "1.2rem" }}>{result.title}</h3>
                <p className="muted" style={{ margin: 0, fontSize: ".88rem", lineHeight: 1.55 }}>
                  {result.summary}
                </p>
              </div>

              <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--silver)", fontSize: ".85rem", lineHeight: 1.65 }}>
                {result.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>

              <div>
                <label
                  htmlFor="lab-editable-md"
                  className="mono muted"
                  style={{ display: "block", fontSize: ".72rem", marginBottom: ".4rem" }}
                >
                  EDITABLE MARKDOWN BRIEF (CUSTOMIZE BEFORE EXPORT)
                </label>
                <textarea
                  id="lab-editable-md"
                  className="lab-output-box"
                  value={editableMarkdown}
                  onChange={(e) => setEditableMarkdown(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <span className="mono tabular cyan" style={{ fontSize: ".82rem", fontWeight: 700 }}>
                  {result.recommendedServiceId} · {result.startingPriceLabel}
                </span>
                <Link
                  href={`/build?service=${encodeURIComponent(result.recommendedServiceId)}&goal=${encodeURIComponent(result.title)}`}
                  className="btn btn-primary"
                >
                  <span>Send to Project Builder</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
