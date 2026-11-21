import { describe, expect, it } from "vitest";
import { recommend, type FinderAnswers } from "@/lib/solution-finder";

const cases: [FinderAnswers, string][] = [
  [{ goal: "presence", complexity: "focused" }, "S03"],
  [{ goal: "presence", complexity: "broad" }, "S02"],
  [{ goal: "presence", complexity: "custom" }, "S01"],
  [{ goal: "sell" }, "S05"],
  [{ goal: "sell", complexity: "focused" }, "S04"],
  [{ goal: "operations" }, "S07"],
  [{ goal: "operations", complexity: "custom" }, "S23"],
  [{ goal: "product", offline: true }, "S09"],
  [{ goal: "product", offline: false }, "S08"],
  [{ goal: "product", offline: false, complexity: "custom" }, "S13"],
  [{ goal: "client_access" }, "S06"],
  [{ goal: "upgrade", complexity: "focused" }, "S21"],
  [{ goal: "upgrade", complexity: "broad" }, "S18"],
  [{ goal: "upgrade", complexity: "custom" }, "S22"],
];

describe("solution finder (v5 catalog)", () => {
  it.each(cases)("maps a valid answer combination through an auditable v5 rule", (answers, expected) => {
    const result = recommend(answers);
    expect(result.kind).toBe("service");
    if (result.kind === "service") {
      expect(result.service.id).toBe(expected);
      expect(result.ruleId).toBeTruthy();
    }
  });

  it("uses a meaningful fallback when presence complexity is unspecified", () => {
    expect(recommend({ goal: "presence" })).toEqual(expect.objectContaining({ kind: "guided_quote" }));
  });
});
