"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Search, Layers, Wrench, AlertCircle } from "lucide-react";
import {
  formatStartingFromBdt,
  services,
  standaloneServices,
  coreTechnicalServices,
  type ServiceSegment,
} from "@/lib/catalog";

type FilterMode = "all" | ServiceSegment;

export function ServiceCatalogExplorer({ compact = false }: { compact?: boolean }) {
  const [segment, setSegment] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((service) => {
      if (segment !== "all" && service.segment !== segment) return false;
      if (!q) return true;
      return (
        service.id.toLowerCase().includes(q) ||
        service.name.toLowerCase().includes(q) ||
        service.categoryName.toLowerCase().includes(q) ||
        service.summary.toLowerCase().includes(q)
      );
    });
  }, [segment, query]);

  return (
    <div>
      <div className="catalog-toolbar">
        <div className="segment-tabs" role="tablist" aria-label="Filter services by segment">
          <button
            type="button"
            role="tab"
            aria-selected={segment === "all"}
            className={`segment-tab${segment === "all" ? " active" : ""}`}
            onClick={() => setSegment("all")}
          >
            All Services ({services.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={segment === "standalone"}
            className={`segment-tab${segment === "standalone" ? " active" : ""}`}
            onClick={() => setSegment("standalone")}
          >
            <Layers size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
            Standalone ({standaloneServices.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={segment === "core_technical"}
            className={`segment-tab${segment === "core_technical" ? " active" : ""}`}
            onClick={() => setSegment("core_technical")}
          >
            <Wrench size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
            Core Technical ({coreTechnicalServices.length})
          </button>
        </div>

        <div className="catalog-search-wrap">
          <Search size={15} />
          <input
            type="search"
            className="catalog-search-input"
            placeholder="Search by code (S01–S24), name, or need..."
            aria-label="Search canonical services"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <div>
              <strong>No matching canonical service</strong>
              <p style={{ margin: "0 0 1rem" }}>
                Try another keyword or clear filters to browse all 22 official v5 services.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSegment("all");
                  setQuery("");
                }}
              >
                Reset filters
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="service-card-grid">
          {filtered.map((service) => (
            <motion.article
              key={service.id}
              className="service-card"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
            >
              <div className="service-card-top">
                <span className="service-code-tag">
                  {service.id} · {service.segment === "standalone" ? "STANDALONE" : "CORE TECHNICAL"}
                </span>
                <span className="service-price-tag tabular">
                  {formatStartingFromBdt(service.startingPriceBdt)}
                </span>
              </div>

              <h3>
                <Link href={`/services/${service.slug}`}>{service.name}</Link>
              </h3>
              <p>{service.summary}</p>

              {service.scopeCaveat && !compact && (
                <div
                  style={{
                    fontSize: ".78rem",
                    color: "var(--gold)",
                    background: "var(--gold-dim)",
                    border: "1px solid rgba(228, 187, 77, 0.35)",
                    padding: ".55rem .7rem",
                    borderRadius: 4,
                    display: "flex",
                    gap: ".5rem",
                    alignItems: "flex-start",
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{service.scopeCaveat}</span>
                </div>
              )}

              <div className="service-card-foot">
                <span className="mono" style={{ fontSize: ".72rem", color: "var(--muted)" }}>
                  {service.addons.length > 0
                    ? `${service.addons.length} compatible add-on${service.addons.length === 1 ? "" : "s"}`
                    : "Standalone scope · Quote required"}
                </span>
                <div style={{ display: "flex", gap: ".9rem", alignItems: "center" }}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="mono"
                    style={{ fontSize: ".76rem", color: "var(--silver)", fontWeight: 700 }}
                  >
                    Specs
                  </Link>
                  <Link
                    href={`/build?service=${service.id}`}
                    className="mono cyan"
                    style={{ fontSize: ".76rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <span>Configure</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
