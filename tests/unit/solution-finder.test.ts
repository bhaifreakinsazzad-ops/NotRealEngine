import { describe, expect, it } from "vitest";
import { recommend, type FinderAnswers } from "@/lib/solution-finder";

const cases: [FinderAnswers, string][] = [
  [{ goal: "presence", complexity: "focused" }, "SVC-01-SPW"],
  [{ goal: "presence", complexity: "broad" }, "SVC-03-BIZ"],
  [{ goal: "sell" }, "SVC-05-EFC"],
  [{ goal: "operations" }, "SVC-11-BMS"],
  [{ goal: "product", offline: true }, "SVC-07-PWA"],
  [{ goal: "product", offline: false }, "SVC-06-WAP"],
  [{ goal: "client_access" }, "SVC-12-BCP"]
];

describe("solution finder", () => {
  it.each(cases)("maps a valid answer combination through an auditable rule", (answers, expected) => {
    const result = recommend(answers);
    expect(result.kind).toBe("service");
    if (result.kind === "service") { expect(result.service.id).toBe(expected); expect(result.ruleId).toBeTruthy(); }
  });

  it("uses a meaningful fallback rather than inventing a match", () => {
    expect(recommend({ goal: "presence", complexity: "custom" })).toEqual(expect.objectContaining({ kind: "guided_quote" }));
  });
});
