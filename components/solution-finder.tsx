"use client";

import Link from "next/link";
import { useState } from "react";
import { formatStartingFromBdt } from "@/lib/catalog";
import { recommend, type FinderAnswers } from "@/lib/solution-finder";

const goals: readonly [FinderAnswers["goal"], string, string][] = [
  ["presence", "Launch a website or landing page", "Mini Website, Business Website, or Landing Page"],
  ["sell", "Sell products or run a sales funnel", "E-commerce Store or Sales Funnel"],
  ["operations", "Manage internal ops or admin workflows", "Business Dashboard or Custom Admin Panel"],
  ["product", "Build a web app, PWA, or SaaS MVP", "Web Application, PWA, or SaaS MVP"],
  ["client_access", "Give clients a private portal", "Client Portal with files, milestones & approvals"],
  ["upgrade", "Fix, redesign, or extend an existing site", "Bug Fixing, Redesign & Revamp, or Feature Dev"],
];

export function SolutionFinder() {
  const [answers, setAnswers] = useState<FinderAnswers>({ goal: "presence", complexity: "focused" });
  const result = recommend(answers);

  const needsComplexity = ["presence", "sell", "operations", "product", "upgrade"].includes(answers.goal);

  return (
    <div className="finder-panel">
      <div className="finder-progress">
        <span className="active">01 GOAL</span>
        <span className={needsComplexity ? "active" : ""}>02 SCOPE</span>
        <span className="active">03 RECOMMENDATION</span>
      </div>
      <div className="finder-content">
        <div className="section-code">RULE-GROUNDED SERVICE ROUTER · V5 CATALOG</div>
        <h3 style={{ margin: 0, fontSize: "1.4rem" }}>What do you need to accomplish?</h3>
        <div className="choice-grid">
          {goals.map(([goal, title, subtitle]) => (
            <button
              key={goal}
              type="button"
              className={`choice${answers.goal === goal ? " active" : ""}`}
              onClick={() =>
                setAnswers({
                  goal,
                  complexity: goal === "presence" || goal === "upgrade" ? "focused" : undefined,
                  offline: false,
                })
              }
            >
              <strong style={{ display: "block", marginBottom: 4 }}>{title}</strong>
              <small style={{ color: "var(--muted)", fontSize: ".78rem" }}>{subtitle}</small>
            </button>
          ))}
        </div>

        {answers.goal === "presence" && (
          <div className="choice-grid">
            <button
              type="button"
              className={`choice${answers.complexity === "focused" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "focused" })}
            >
              Focused single-objective campaign page (S03)
            </button>
            <button
              type="button"
              className={`choice${answers.complexity === "custom" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "custom" })}
            >
              Compact founder / brand mini website (S01)
            </button>
            <button
              type="button"
              className={`choice${answers.complexity === "broad" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "broad" })}
            >
              Structured multi-page business website (S02)
            </button>
          </div>
        )}

        {answers.goal === "sell" && (
          <div className="choice-grid">
            <button
              type="button"
              className={`choice${answers.complexity !== "focused" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "broad" })}
            >
              Multi-product catalog & store orders (S05)
            </button>
            <button
              type="button"
              className={`choice${answers.complexity === "focused" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "focused" })}
            >
              Single-offer acquisition & qualification funnel (S04)
            </button>
          </div>
        )}

        {answers.goal === "operations" && (
          <div className="choice-grid">
            <button
              type="button"
              className={`choice${answers.complexity !== "custom" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "broad" })}
            >
              KPI, sales & operations dashboard (S07)
            </button>
            <button
              type="button"
              className={`choice${answers.complexity === "custom" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "custom" })}
            >
              Staff admin panel with role controls (S23)
            </button>
          </div>
        )}

        {answers.goal === "product" && (
          <div className="choice-grid">
            <button
              type="button"
              className={`choice${!answers.offline && answers.complexity !== "custom" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, offline: false, complexity: "broad" })}
            >
              Browser-based custom web application (S08)
            </button>
            <button
              type="button"
              className={`choice${answers.offline ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, offline: true })}
            >
              Installable mobile-first PWA with offline shell (S09)
            </button>
            <button
              type="button"
              className={`choice${!answers.offline && answers.complexity === "custom" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, offline: false, complexity: "custom" })}
            >
              Multi-tenant SaaS MVP launch (S13)
            </button>
          </div>
        )}

        {answers.goal === "upgrade" && (
          <div className="choice-grid">
            <button
              type="button"
              className={`choice${answers.complexity === "focused" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "focused" })}
            >
              Fix specific bugs or broken flows (S21)
            </button>
            <button
              type="button"
              className={`choice${answers.complexity === "broad" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "broad" })}
            >
              Redesign & modernize an outdated site (S18)
            </button>
            <button
              type="button"
              className={`choice${answers.complexity === "custom" ? " active" : ""}`}
              onClick={() => setAnswers({ ...answers, complexity: "custom" })}
            >
              Add a new scoped feature to existing site (S22)
            </button>
          </div>
        )}

        <div className="recommendation">
          {result.kind === "service" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: ".4rem" }}>
                <strong style={{ margin: 0 }}>
                  {result.service.id} — {result.service.name}
                </strong>
                <span className="mono tabular cyan" style={{ fontSize: ".82rem", fontWeight: 700 }}>
                  {formatStartingFromBdt(result.service.startingPriceBdt)}
                </span>
              </div>
              <p className="muted" style={{ margin: "0 0 1rem", lineHeight: 1.55 }}>
                {result.reason}
              </p>
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                <Link className="btn btn-primary" href={`/build?service=${result.service.id}`}>
                  Configure this project
                </Link>
                <Link className="btn" href={`/services/${result.service.slug}`}>
                  View service specs
                </Link>
              </div>
            </>
          ) : (
            <>
              <strong>Guided Custom Quotation</strong>
              <p className="muted" style={{ margin: "0 0 1rem" }}>{result.reason}</p>
              <Link className="btn btn-primary" href="/build">
                Open Project Builder
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
