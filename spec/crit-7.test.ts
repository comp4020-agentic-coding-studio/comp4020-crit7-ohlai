import { JSDOM } from "jsdom";
import { afterAll, describe, expect, inject, it } from "vitest";

// Crit 7's published spec, turned into contracts. Five lines are published;
// these are the ones a machine can hold. The other two are named at the
// bottom of this file so they are not quietly forgotten.
//
// The slice is the degree planner in CLAUDE.md, so the core flow is putting a
// course into a semester of the plan. The contract the two flow tests hold
// the app to, and nothing more about how it is built:
//
//   - GET / is the degree plan. Each semester is an element carrying
//     data-term="<year>-S<1|2>", and each course in it carries
//     data-course="<CODE>".
//   - POST /api/plan with term and course adds a course to the plan, and
//     POST /api/plan/remove with the same fields takes it out. Both answer
//     303 back to a page, so they work as plain HTML forms.
//
// The courses used are real AACOM electives that run in the semester they
// are placed in, so a planner that refuses impossible entries still accepts
// these.

const LIVE_URL = "https://comp4020-crit7-ohlai.fly.dev";
const baseUrl = inject("baseUrl");

// Astro checks form POSTs carry a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
const post = (path: string, fields: Record<string, string>) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams(fields),
    redirect: "manual",
  });

// A fresh request every time: no cookies, no cache, nothing carried over.
async function planned(term: string, course: string): Promise<boolean> {
  const res = await fetch(baseUrl, { cache: "no-store" });
  expect(res.status).toBe(200);
  const { document } = new JSDOM(await res.text()).window;
  return document.querySelector(`[data-term="${term}"] [data-course="${course}"]`) !== null;
}

describe("spec: the app loads at its fly.dev URL", () => {
  // The only check here that reaches the network. It answers the first spec
  // line literally, and it is red until the first deploy. If it fails while
  // the app is up, check the machine hasn't been suspended past its start
  // timeout: fly.toml stops the machine when idle and starts it on request,
  // so a cold start is the slow path, not a fault.
  it("serves a 200 with an HTML document", async () => {
    const res = await fetch(LIVE_URL, { signal: AbortSignal.timeout(30_000) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("<html");
  }, 35_000);
});

describe("spec: a slice of a real ANU system, wired end to end", () => {
  // The page renders from the database rather than from a literal in the
  // source: writing through the app changes what the next request returns,
  // in both directions.
  it("renders its records from the database, not from hardcoded data", async () => {
    const entry = { term: "2028-S1", course: "COMP4610" };

    await post("/api/plan/remove", entry);
    expect(await planned(entry.term, entry.course)).toBe(false);

    const added = await post("/api/plan", entry);
    expect(added.status).toBe(303);
    expect(await planned(entry.term, entry.course)).toBe(true);

    const removed = await post("/api/plan/remove", entry);
    expect(removed.status).toBe(303);
    expect(await planned(entry.term, entry.course)).toBe(false);
  });
});

describe("spec: the core flow persists across a reload", () => {
  // Create the thing the app is for, fetch the page again from scratch, and
  // the thing is still there.
  const entry = { term: "2028-S2", course: "COMP4650" };

  // Run against a deployed app (SPEC_BASE_URL), the entry would otherwise
  // stay in my real plan.
  afterAll(async () => {
    await post("/api/plan/remove", entry);
  });

  it("a created plan entry survives a fresh page load", async () => {

    const res = await post("/api/plan", entry);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/^\//);

    expect(await planned(entry.term, entry.course)).toBe(true);
    expect(await planned(entry.term, entry.course)).toBe(true);
  });
});

// Judged by a person at the crit, and no test reaches them:
//
//   - whether the slice is one I actually deal with, and whether replacing it
//     is a real improvement over the system it stands in for
//   - whether I can account for how I directed, grounded and corrected the
//     work
//
// The process evidence behind the second one is checked mechanically, but
// only for existence: `pnpm check:evidence` holds PROCESS.md, the reflection
// in reflections/crit-7.md, and whether the commits PROCESS.md cites resolve.
// Whether the account is any good is the crit's business.
