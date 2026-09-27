import { JSDOM } from "jsdom";
import { afterAll, describe, expect, inject, it } from "vitest";

// Auto-enrol's contract, driven over HTTP against the running app:
//
//   - POST /api/auto-enrol (term, enabled) turns "enrol me from my plan" on.
//   - POST /api/demo/window (term, delay) opens that semester's window, and
//     POST /api/demo/reset (term) puts it back.
//   - GET /enrolment/ shows each semester as [data-window="<term>"], with
//     each enrolled course as [data-enrolled="<CODE>"].
//
// No timer is involved: the window is processed by whichever request comes
// after it opens. So the test opens it, then makes requests, and counts.
// The seeded plan for Semester 1 2027 is four courses, all allowed.

const baseUrl = inject("baseUrl");
const TERM = "2027-S1";
const PLANNED = ["COMP3310", "COMP3630", "COMP4450", "COMP4670"];

const post = (path: string, fields: Record<string, string>) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams(fields),
    redirect: "manual",
  });

async function enrolledIn(term: string): Promise<string[]> {
  const res = await fetch(new URL("/enrolment/", baseUrl));
  expect(res.status).toBe(200);
  const { document } = new JSDOM(await res.text()).window;
  return [...document.querySelectorAll(`[data-window="${term}"] [data-enrolled]`)].map(
    (el) => el.getAttribute("data-enrolled") ?? "",
  );
}

describe("auto-enrol", () => {
  afterAll(async () => {
    await post("/api/demo/reset", { term: TERM });
    await post("/api/auto-enrol", { term: TERM, enabled: "false" });
  });

  it("does nothing before the window opens", async () => {
    await post("/api/demo/reset", { term: TERM });
    const on = await post("/api/auto-enrol", { term: TERM, enabled: "true" });
    expect(on.status).toBe(303);
    expect(await enrolledIn(TERM)).toEqual([]);
  });

  it("enrols the planned courses on the first request after the window opens", async () => {
    const opened = await post("/api/demo/window", { term: TERM, delay: "0" });
    expect(opened.status).toBe(303);
    expect((await enrolledIn(TERM)).sort()).toEqual(PLANNED);
  });

  it("never enrols the same course twice, however many requests arrive", async () => {
    await Promise.all(Array.from({ length: 8 }, () => fetch(new URL("/", baseUrl))));
    const again = await enrolledIn(TERM);
    expect(again.sort()).toEqual(PLANNED);
    expect(new Set(again).size).toBe(again.length);
  });

  it("shows the enrolments on the plan, where they persist", async () => {
    const res = await fetch(baseUrl);
    const { document } = new JSDOM(await res.text()).window;
    for (const code of PLANNED) {
      const entry = document.querySelector(`[data-term="${TERM}"] [data-course="${code}"]`);
      expect(entry?.textContent).toMatch(/Enrolled/i);
    }
  });

  it("refuses a manual enrolment while a window is shut", async () => {
    const res = await post("/api/enrol", { term: "2027-S2", course: "COMP3900", back: "/courses/" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/error=.*opens/);
  });
});
