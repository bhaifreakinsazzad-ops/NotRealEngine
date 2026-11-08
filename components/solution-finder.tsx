"use client";

import Link from "next/link";
import { useState } from "react";
import { recommend, type FinderAnswers } from "@/lib/solution-finder";

const goals: { value: FinderAnswers["goal"]; label: string }[] = [
  { value: "presence", label: "Present my business clearly" },
  { value: "sell", label: "Sell products or services online" },
  { value: "operations", label: "Manage orders and operations" },
  { value: "product", label: "Launch a digital product" },
  { value: "client_access", label: "Give clients secure access" }
];

export function SolutionFinder() {
  const [answers, setAnswers] = useState<Partial<FinderAnswers>>({});
  const result = answers.goal ? recommend(answers as FinderAnswers) : null;
  return (
    <div className="finder-panel">
      <div className="finder-progress"><span className="active">01 · GOAL</span><span>02 · CONTEXT</span><span>03 · RESULT</span></div>
      <div className="finder-content">
        <h3>What do you want the finished system to help you do?</h3>
        <div className="choice-grid">
          {goals.map((goal) => (
            <button key={goal.value} type="button" className={`choice ${answers.goal === goal.value ? "active" : ""}`} onClick={() => setAnswers({ goal: goal.value, complexity: goal.value === "presence" ? "broad" : undefined })}>{goal.label}</button>
          ))}
        </div>
        {answers.goal === "presence" && <div className="field"><label htmlFor="complexity">How much information do you need to organize?</label><select id="complexity" className="select" value={answers.complexity} onChange={(event) => setAnswers((current) => ({ ...current, complexity: event.target.value as FinderAnswers["complexity"] }))}><option value="focused">One focused offer</option><option value="broad">Several services or audiences</option><option value="custom">I am not sure yet</option></select></div>}
        {answers.goal === "product" && <label className="addon-option"><input type="checkbox" checked={answers.offline ?? false} onChange={(event) => setAnswers((current) => ({ ...current, offline: event.target.checked }))} /><span><strong>Offline or installable use matters</strong><small>The product may be used with unreliable connectivity.</small></span></label>}
        {result && <div className="recommendation"><strong>{result.kind === "service" ? result.service.name : "Guided quotation"}</strong><span className="muted">{result.reason}</span><div style={{ marginTop: "1rem" }}><Link className="btn btn-primary" href={result.kind === "service" ? `/build?service=${result.service.id}` : "/build"}>Configure this project</Link></div></div>}
      </div>
    </div>
  );
}
