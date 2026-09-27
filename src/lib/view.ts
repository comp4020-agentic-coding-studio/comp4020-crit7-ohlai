import {
  courseMap,
  getStudent,
  listCourses,
  listEntries,
  listRequirements,
  listTerms,
  termInfo,
} from "./db";
import { checkPlan, type Entry, requiredSlots, termLabel } from "./rules";
import type { Term } from "./schema";

// Everything a page needs to draw the plan and the progress panel, computed
// once per request from the database.
export function loadPlan() {
  const student = getStudent();
  const terms = listTerms();
  const catalogue = listCourses();
  const courses = courseMap();
  const entries = listEntries(student.id);
  const requirements = listRequirements();
  const infos = terms.map(termInfo);
  const { results, problems } = checkPlan(requirements, entries, courses, infos);
  const slots = requiredSlots(requirements, results, entries, infos);

  const unitsWhere = (pred: (e: Entry) => boolean) =>
    entries.filter(pred).reduce((s, e) => s + (courses.get(e.code)?.units ?? 0), 0);
  const total = results.find((r) => r.label.includes("units in total"))?.progress?.target ?? 0;

  return {
    student,
    terms,
    catalogue,
    courses,
    entries,
    results,
    problems,
    slots,
    units: {
      completed: unitsWhere((e) => e.status === "completed"),
      enrolled: unitsWhere((e) => e.status === "enrolled"),
      planned: unitsWhere((e) => e.status === "planned"),
      total,
    },
  };
}

export type PlanView = ReturnType<typeof loadPlan>;

// ---------------------------------------------------------------------------
// Time, always shown in Canberra time

const TZ = "Australia/Sydney";

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDay(isoDate: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${isoDate}T12:00:00+10:00`));
}

export type TermPhase = "finished" | "underway" | "open" | "upcoming" | "closed";

/** Where a semester stands right now, as ISIS would put it. */
export function termPhase(term: Term, now = new Date()): TermPhase {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  const iso = now.toISOString();
  if (term.endsOn < today) return "finished";
  if (iso >= term.enrolmentOpensAt && iso < term.enrolmentClosesAt) return "open";
  if (term.startsOn <= today) return "underway";
  if (iso < term.enrolmentOpensAt) return "upcoming";
  return "closed";
}

/** Can the plan for this semester still change? Not once it has started. */
export function isPlannable(term: Term, now = new Date()): boolean {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  return term.startsOn > today;
}

export { termLabel };

/** Where a form should send the browser back to. Only same-site paths. */
export function safeBack(value: FormDataEntryValue | null, fallback = "/"): string {
  const back = typeof value === "string" ? value : "";
  return back.startsWith("/") && !back.startsWith("//") ? back : fallback;
}

/** Appends a one-off notice to a path, keeping any #fragment at the end. */
export function withNotice(path: string, notice: string, kind: "ok" | "error" = "ok"): string {
  const [base, hash] = path.split("#");
  const url = new URL(base, "http://x");
  url.searchParams.set(kind === "ok" ? "notice" : "error", notice);
  return `${url.pathname}${url.search}${hash ? `#${hash}` : ""}`;
}
