import { describe, expect, it } from "vitest";
import { type CourseInfo, checkPlan, type Entry } from "../src/lib/rules";
import { COURSES, HISTORY, PLAN, REQUIREMENTS, seedTerms } from "../src/lib/seed";

// The plan check against the real seed: the three kinds of "missing" the
// brief names (a required course not in the plan, a unit count short, a
// prerequisite placed after the course that needs it), plus the check
// staying quiet when there is nothing wrong. Pure functions, no server.

const courses = new Map<string, CourseInfo>(
  COURSES.map((c) => [
    c.code,
    {
      code: c.code,
      title: c.title,
      units: c.units,
      offeredS1: c.s1,
      offeredS2: c.s2,
      prereq: c.prereq ?? null,
      repeatable: c.repeatable ?? false,
    },
  ]),
);
const terms = seedTerms();
const requirements = REQUIREMENTS.map((r, i) => ({ id: i + 1, label: r.label, rule: r.rule }));
const seeded: Entry[] = [
  ...HISTORY.map((h) => ({ code: h.code, termId: h.termId, status: h.status })),
  ...PLAN.map((p) => ({ code: p.code, termId: p.termId, status: "planned" as const })),
];
const planned = (termId: string, ...codes: string[]): Entry[] =>
  codes.map((code) => ({ code, termId, status: "planned" as const }));
const check = (entries: Entry[]) => checkPlan(requirements, entries, courses, terms);
const messages = (entries: Entry[], kind?: string) =>
  check(entries)
    .problems.filter((p) => !kind || p.kind === kind)
    .map((p) => p.message);

// A plan that finishes the degree: the seed, then 2028 filled in.
const complete: Entry[] = [
  ...seeded,
  ...planned("2028-S1", "COMP4500", "COMP4528", "COMP4680", "COMP3620"),
  ...planned("2028-S2", "COMP4650", "COMP4020", "MATH2301", "COMP4691"),
];

describe("the plan check", () => {
  it("names a required course that is not in the plan", () => {
    const without = seeded.filter((e) => e.code !== "COMP3630");
    expect(messages(without, "requirement").join("\n")).toMatch(/COMP3630/);
  });

  it("says when the plan is short of units", () => {
    expect(messages(seeded, "requirement").join("\n")).toMatch(/192 units in total: 48 more units/);
  });

  it("flags a prerequisite placed after the course that needs it", () => {
    // COMP3620 needs COMP2620; put COMP2620 a semester later.
    const entries = [...seeded, ...planned("2027-S1", "COMP3620"), ...planned("2027-S2", "COMP4691")];
    const moved = entries
      .filter((e) => e.code !== "COMP2620")
      .concat(planned("2027-S2", "COMP2620"));
    const order = messages(moved, "order");
    expect(order.some((m) => m.startsWith("COMP3620 in Semester 1 2027") && m.includes("COMP2620 is in Semester 2 2027"))).toBe(true);
  });

  it("flags a course in a semester it does not run in", () => {
    expect(messages([...seeded, ...planned("2028-S2", "COMP4610")], "offering")).toContain(
      "COMP4610 runs in Semester 1 only, but it is in Semester 2 2028.",
    );
  });

  it("wants COMP4500 in back-to-back semesters for the team project", () => {
    expect(messages(seeded, "requirement").join("\n")).toMatch(/COMP4500 twice/);
    const twice = [...seeded, ...planned("2028-S1", "COMP4500")];
    expect(messages(twice, "requirement").join("\n")).not.toMatch(/COMP4500 twice/);
  });

  it("finds nothing wrong with a plan that finishes the degree", () => {
    expect(check(complete).problems).toEqual([]);
    expect(check(complete).results.every((r) => r.status !== "missing")).toBe(true);
  });

  it("treats what the seed says is done as done", () => {
    const results = check(seeded).results;
    const status = (label: string) => results.find((r) => r.label === label)?.status;
    expect(status("Programming as Problem Solving")).toBe("done");
    expect(status("ICT-related courses")).toBe("done");
    expect(status("Compulsory courses")).toBe("planned");
  });
});
