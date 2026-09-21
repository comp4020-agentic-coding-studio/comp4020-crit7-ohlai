import { describe, expect, it } from "vitest";

// Crit 7's published spec, turned into contracts. Five lines are published;
// these are the ones a machine can hold. The other two are named at the
// bottom of this file so they are not quietly forgotten.
//
// The two contracts that matter most, end-to-end wiring and persistence
// across a reload, cannot be written until the ANU system and the slice are
// chosen, because the flow they assert is the flow through that slice. They
// are `it.todo` below rather than a guess. Filling them in is the first job
// after the choice lands in CLAUDE.md.

const LIVE_URL = "https://comp4020-crit7-ohlai.fly.dev";

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
  // Waiting on the choice of system. What this has to assert: the page
  // renders from the database rather than from a literal in the source, so
  // writing a record through the app changes what the next request returns.
  it.todo("renders its records from the database, not from hardcoded data");
});

describe("spec: the core flow persists across a reload", () => {
  // Waiting on the choice of system. What this has to assert: create the
  // thing the app is for, fetch the page again, the thing is still there.
  // spec/guestbook.test.ts does exactly this for the starter's messages and
  // is the shape to copy, then delete once the starter goes.
  it.todo("a created record survives a fresh page load");
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
