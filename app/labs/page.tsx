import { MarketingShell } from "@/components/marketing-shell";
import { EngineShowcase } from "@/components/engine-showcase";
import { Sparkles, Cpu, Layers, Activity } from "lucide-react";
import Link from "next/link";

export default function LabsPage() {
  return (
    <MarketingShell>
      <section className="page-hero">
        <div className="shell">
          <div className="hero-pill">
            <Cpu size={14} className="cyan" />
            <span>GRAPHICS & COMPUTE RESEARCH</span>
          </div>
          <h1>Labs: interaction patterns & graphics pipelines under evaluation.</h1>
          <p>
            Explore the core computational visualization engine behind NOTREAL ENGINE. Demonstrating real-time spatial dynamics, progressive web rendering, and client-side simulation.
          </p>
        </div>
      </section>

      {/* Engine Visual Showcase in Labs */}
      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">EXPERIMENTAL BENCHMARK // ENGINE REEL</div>
              <h2>Active Graphics & Simulation Core</h2>
            </div>
            <p>
              4K 60FPS high-throughput rendering pipeline. Evaluated for low-latency web delivery and responsive interactive framing.
            </p>
          </div>

          <EngineShowcase
            title="PHYSICS & SHADER RUNTIME (BUILD 2026.11)"
            subtitle="Demonstrating dynamic illumination, volumetric particles, and high-framerate rendering."
          />

          <div className="labs-spec-grid">
            <div className="spec-card">
              <Activity size={20} className="cyan" />
              <h4>Adaptive Frame Streaming</h4>
              <p>Hardware-accelerated decoding with automatic progressive fallbacks for multi-device performance.</p>
            </div>
            <div className="spec-card">
              <Layers size={20} className="gold" />
              <h4>Multi-Layered Shaders</h4>
              <p>Zero layout-shift container architecture adhering to modern web performance standards.</p>
            </div>
            <div className="spec-card">
              <Sparkles size={20} className="cyan" />
              <h4>Zero Bloat Footprint</h4>
              <p>Lazy-loaded media streams defer network overhead until viewport intersection.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="shell section-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>Interested in applying our graphics or systems engine?</h2>
            <p style={{ marginTop: "1rem" }}>
              Explore our canonical services or discuss custom engineering with our leads.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/services">
              View Canonical Services
            </Link>
            <Link className="btn" href="/contact">
              Consult With Engineering
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
