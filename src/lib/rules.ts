// The degree logic, with no database in it: prerequisites, degree rules, and
// the plan check built from both. Everything here takes plain data and
// returns plain data, so it can be tested without booting the server.

// ---------------------------------------------------------------------------
// Shapes

/** A prerequisite, as a JSON expression. Mirrors how P&C words them. */
export type Prereq =
  | { course: string }
  | { any: Prereq[] }
  | { all: Prereq[] }
  // "24 units of COMP coded courses", "12 units of 3000/4000-level COMP"
  | { units: number; subjects?: string[]; level?: number; minLevel?: number }
  // "completed or currently studying COMP2100"
  | { coreq: string };

/** A degree rule, as a JSON expression. */
export type Rule =
  // the degree's total unit count
  | { kind: "total"; units: number }
  // "a maximum of 60 units may come from 1000-level courses"
  | { kind: "max"; units: number; level: number }
  // "a minimum of 48 units from 4000-level COMP courses", counting everything
  | { kind: "min"; units: number; subjects: string[]; level: number }
  // "6 units from COMP1100 / COMP1130", "24 units from the list"
  | { kind: "choose"; units: number; courses: string[]; min4000?: number }
  // "48 units from the compulsory courses"
  | { kind: "all"; courses: string[] }
  // "18 units from 3000 or 4000-level COMP", from courses nothing else claimed
  | { kind: "pool"; units: number; subjects: string[]; minLevel: number }
  // "must be completed twice, in consecutive semesters"
  | { kind: "twice"; course: string }
  // "Either ... OR ... OR ...": met when any one option's rules are all met
  | { kind: "either"; options: { label: string; rules: Rule[] }[] };

export interface CourseInfo {
  code: string;
  title: string;
  units: number;
  offeredS1: boolean;
  offeredS2: boolean;
  prereq: Prereq | null;
  repeatable: boolean;
}

export interface TermInfo {
  id: string;
  year: number;
  half: number;
}

export type EntryStatus = "completed" | "enrolled" | "planned";

/** One course in one semester of the plan, whatever its status. */
export interface Entry {
  code: string;
  termId: string;
  status: EntryStatus;
}

export interface RequirementInfo {
  id: number;
  label: string;
  rule: Rule;
}

// ---------------------------------------------------------------------------
// Small helpers

export const subjectOf = (code: string) => code.slice(0, 4);
export const levelOf = (code: string) => Number(code[4]) * 1000;

export function termLabel(term: Pick<TermInfo, "year" | "half">): string {
  return `Semester ${term.half} ${term.year}`;
}

/** Terms sort by year, then half. The index is what "before" means. */
export function termOrder(terms: TermInfo[]): Map<string, number> {
  const sorted = [...terms].sort((a, b) => a.year - b.year || a.half - b.half);
  return new Map(sorted.map((t, i) => [t.id, i]));
}

function unitsOf(entries: Entry[], courses: Map<string, CourseInfo>): number {
  return entries.reduce((sum, e) => sum + (courses.get(e.code)?.units ?? 0), 0);
}

function listOr(codes: string[]): string {
  if (codes.length <= 1) return codes.join("");
  return `${codes.slice(0, -1).join(", ")} or ${codes.at(-1)}`;
}

function listAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

// ---------------------------------------------------------------------------
// Prerequisites

/** Plain words for a prerequisite, for messages. */
export function describePrereq(p: Prereq): string {
  if ("course" in p) return p.course;
  if ("coreq" in p) return `${p.coreq} (before or alongside)`;
  if ("units" in p) {
    const level = p.level ? `${p.level}-level ` : p.minLevel ? `${p.minLevel}+ level ` : "";
    const subjects = p.subjects ? `${p.subjects.join(" or ")} ` : "";
    return `${p.units} units of ${level}${subjects}courses`;
  }
  const parts = ("any" in p ? p.any : p.all).map((q) =>
    "any" in q || "all" in q ? `(${describePrereq(q)})` : describePrereq(q),
  );
  if ("any" in p && parts.every((s) => /^[A-Z]{4}\d{4}$/.test(s))) return listOr(parts);
  return parts.join("any" in p ? " or " : " and ");
}

/** Every course code a prerequisite names. */
export function namedCourses(p: Prereq): string[] {
  if ("course" in p) return [p.course];
  if ("coreq" in p) return [p.coreq];
  if ("units" in p) return [];
  return ("any" in p ? p.any : p.all).flatMap(namedCourses);
}

/**
 * Is the prerequisite met, given the courses done before this semester and
 * the ones alongside it? Unit counts count every earlier course that
 * matches, whatever else it is doing: P&C counts them that way too.
 */
export function prereqMet(
  p: Prereq,
  before: Entry[],
  alongside: Entry[],
  courses: Map<string, CourseInfo>,
): boolean {
  if ("course" in p) return before.some((e) => e.code === p.course);
  if ("coreq" in p) return [...before, ...alongside].some((e) => e.code === p.coreq);
  if ("any" in p) return p.any.some((q) => prereqMet(q, before, alongside, courses));
  if ("all" in p) return p.all.every((q) => prereqMet(q, before, alongside, courses));
  const matching = before.filter(
    (e) =>
      (!p.subjects || p.subjects.includes(subjectOf(e.code))) &&
      (!p.level || levelOf(e.code) === p.level) &&
      (!p.minLevel || levelOf(e.code) >= p.minLevel),
  );
  return unitsOf(matching, courses) >= p.units;
}

// ---------------------------------------------------------------------------
// Degree rules

export type RuleStatus = "done" | "planned" | "missing";

export interface RuleResult {
  id: number;
  label: string;
  status: RuleStatus;
  /** What the rule still needs from the whole plan, if anything. */
  missing: string | null;
  /** Units counted towards the rule, completed only and whole plan. */
  progress: { done: number; planned: number; target: number } | null;
}

interface Outcome {
  met: boolean;
  missing: string | null;
  counted: number;
  target: number | null;
}

// Evaluates one rule against a set of entries. `claimed` holds the entry
// keys earlier rules used; a rule that names courses adds the ones it used.
function evaluate(
  rule: Rule,
  entries: Entry[],
  courses: Map<string, CourseInfo>,
  order: Map<string, number>,
  claimed: Set<string>,
  labels: Map<string, string>,
): Outcome {
  const key = (e: Entry) => `${e.termId}:${e.code}`;
  const free = entries
    .filter((e) => !claimed.has(key(e)))
    .sort((a, b) => (order.get(a.termId) ?? 0) - (order.get(b.termId) ?? 0));
  const units = (code: string) => courses.get(code)?.units ?? 0;

  switch (rule.kind) {
    case "total": {
      const counted = unitsOf(entries, courses);
      return {
        met: counted >= rule.units,
        missing: counted >= rule.units ? null : `${rule.units - counted} more units`,
        counted,
        target: rule.units,
      };
    }
    case "max": {
      const counted = unitsOf(
        entries.filter((e) => levelOf(e.code) === rule.level),
        courses,
      );
      return {
        met: counted <= rule.units,
        missing:
          counted <= rule.units
            ? null
            : `${counted} units of ${rule.level}-level courses, ${counted - rule.units} over the ${rule.units}-unit limit`,
        counted,
        target: null,
      };
    }
    case "min": {
      const counted = unitsOf(
        entries.filter(
          (e) => rule.subjects.includes(subjectOf(e.code)) && levelOf(e.code) === rule.level,
        ),
        courses,
      );
      return {
        met: counted >= rule.units,
        missing:
          counted >= rule.units
            ? null
            : `${rule.units - counted} more units of ${rule.level}-level ${rule.subjects.join("/")} courses`,
        counted,
        target: rule.units,
      };
    }
    case "all": {
      const used: Entry[] = [];
      const absent: string[] = [];
      for (const code of rule.courses) {
        const hit = free.find((e) => e.code === code);
        if (hit) used.push(hit);
        else absent.push(code);
      }
      for (const e of used) claimed.add(key(e));
      return {
        met: absent.length === 0,
        missing: absent.length ? `not in the plan: ${listAnd(absent)}` : null,
        counted: unitsOf(used, courses),
        target: rule.courses.reduce((s, c) => s + units(c), 0),
      };
    }
    case "choose": {
      const pool = free.filter((e) => rule.courses.includes(e.code));
      // Take 4000-level courses first when the rule asks for some.
      if (rule.min4000) pool.sort((a, b) => levelOf(b.code) - levelOf(a.code));
      const used: Entry[] = [];
      for (const e of pool) {
        if (unitsOf(used, courses) >= rule.units) break;
        used.push(e);
      }
      for (const e of used) claimed.add(key(e));
      const counted = unitsOf(used, courses);
      const upper = unitsOf(
        used.filter((e) => levelOf(e.code) >= 4000),
        courses,
      );
      const short = Math.max(0, rule.units - counted);
      const shortUpper = rule.min4000 ? Math.max(0, rule.min4000 - upper) : 0;
      const needs: string[] = [];
      if (short) {
        const options = rule.courses.filter((c) => !used.some((e) => e.code === c));
        needs.push(
          rule.units === units(rule.courses[0]) && rule.courses.length <= 3
            ? `one of ${listOr(rule.courses)}`
            : `${short} more units from ${listOr(options.slice(0, 6))}${options.length > 6 ? " or others on the list" : ""}`,
        );
      }
      if (shortUpper) needs.push(`${shortUpper} more of those units at 4000 level`);
      return {
        met: !short && !shortUpper,
        missing: needs.length ? listAnd(needs) : null,
        counted,
        target: rule.units,
      };
    }
    case "pool": {
      const pool = free.filter(
        (e) => rule.subjects.includes(subjectOf(e.code)) && levelOf(e.code) >= rule.minLevel,
      );
      const used: Entry[] = [];
      for (const e of pool) {
        if (unitsOf(used, courses) >= rule.units) break;
        used.push(e);
      }
      for (const e of used) claimed.add(key(e));
      const counted = unitsOf(used, courses);
      return {
        met: counted >= rule.units,
        missing:
          counted >= rule.units
            ? null
            : `${rule.units - counted} more units of ${rule.minLevel}+ level ${rule.subjects.join("/")} courses not already counted elsewhere`,
        counted,
        target: rule.units,
      };
    }
    case "twice": {
      const runs = free
        .filter((e) => e.code === rule.course)
        .map((e) => order.get(e.termId) ?? 0)
        .sort((a, b) => a - b);
      let pair: [number, number] | null = null;
      for (let i = 1; i < runs.length; i++) {
        if (runs[i] === runs[i - 1] + 1) pair = [runs[i - 1], runs[i]];
      }
      // Claim the pair, or every run when there is no pair, so a sibling
      // rule in the same capstone option cannot count this course as well.
      for (const e of free) {
        if (e.code === rule.course && (!pair || pair.includes(order.get(e.termId) ?? -1))) {
          claimed.add(key(e));
        }
      }
      const where = runs.length
        ? ` (it is in ${listAnd(
            free
              .filter((e) => e.code === rule.course)
              .map((e) => labels.get(e.termId) ?? e.termId),
          )})`
        : "";
      return {
        met: pair !== null,
        missing: pair ? null : `${rule.course} twice, in back-to-back semesters${where}`,
        counted: pair ? units(rule.course) * 2 : units(rule.course) * Math.min(runs.length, 1),
        target: units(rule.course) * 2,
      };
    }
    case "either": {
      // Try each option on a copy of the claims, keep the first that works,
      // otherwise report the option that got furthest.
      let best: { outcome: Outcome; claims: Set<string>; label: string; score: number } | null =
        null;
      for (const option of rule.options) {
        const claims = new Set(claimed);
        const results = option.rules.map((r) =>
          evaluate(r, entries, courses, order, claims, labels),
        );
        const met = results.every((r) => r.met);
        const counted = results.reduce((s, r) => s + r.counted, 0);
        const target = results.reduce((s, r) => s + (r.target ?? 0), 0);
        const outcome: Outcome = {
          met,
          missing: met
            ? null
            : `${option.label}: ${results
                .filter((r) => !r.met)
                .map((r) => r.missing)
                .join("; ")}`,
          counted,
          target,
        };
        const score = met ? Number.POSITIVE_INFINITY : counted;
        if (!best || score > best.score) best = { outcome, claims, label: option.label, score };
        if (met) break;
      }
      if (!best) return { met: false, missing: "no options", counted: 0, target: null };
      // Only a met option keeps its courses. A half-done option lets them
      // go, so later rules can still count them.
      if (best.outcome.met) for (const k of best.claims) claimed.add(k);
      return best.outcome;
    }
  }
}

/**
 * Checks every degree rule twice: once on completed courses alone (is it
 * done?) and once on the whole plan (will it be done?). A rule is missing
 * when the whole plan does not meet it.
 */
export function checkRequirements(
  requirements: RequirementInfo[],
  entries: Entry[],
  courses: Map<string, CourseInfo>,
  terms: TermInfo[],
): RuleResult[] {
  const order = termOrder(terms);
  const labels = new Map(terms.map((t) => [t.id, termLabel(t)]));
  const completed = entries.filter((e) => e.status === "completed");
  const doneClaims = new Set<string>();
  const planClaims = new Set<string>();

  return requirements.map(({ id, label, rule }) => {
    const done = evaluate(rule, completed, courses, order, doneClaims, labels);
    const plan = evaluate(rule, entries, courses, order, planClaims, labels);
    // A maximum is broken by adding, so the plan decides it alone.
    const status: RuleStatus =
      rule.kind === "max"
        ? plan.met
          ? "done"
          : "missing"
        : done.met
          ? "done"
          : plan.met
            ? "planned"
            : "missing";
    return {
      id,
      label,
      status,
      missing: plan.met ? null : plan.missing,
      progress:
        plan.target === null ? null : { done: done.counted, planned: plan.counted, target: plan.target },
    };
  });
}

// ---------------------------------------------------------------------------
// Required-course slots, for the progress panel

export interface Slot {
  label: string;
  status: "completed" | "planned" | "uncovered";
  where: string | null;
}

/**
 * The degree's required courses as slots: each compulsory course, each
 * "one of" choice, and the larger named blocks (specialisation, capstone)
 * as one slot each, taking their status from the rule check.
 */
export function requiredSlots(
  requirements: RequirementInfo[],
  results: RuleResult[],
  entries: Entry[],
  terms: TermInfo[],
): Slot[] {
  const labels = new Map(terms.map((t) => [t.id, termLabel(t)]));
  const best = (codes: string[]): Slot["status"] =>
    entries.some((e) => codes.includes(e.code) && e.status === "completed")
      ? "completed"
      : entries.some((e) => codes.includes(e.code))
        ? "planned"
        : "uncovered";
  const whereOf = (codes: string[]) => {
    const e = entries.find((x) => codes.includes(x.code) && x.status === "completed") ??
      entries.find((x) => codes.includes(x.code));
    return e ? (labels.get(e.termId) ?? e.termId) : null;
  };

  const slots: Slot[] = [];
  requirements.forEach(({ rule, label }, i) => {
    const result = results[i];
    if (rule.kind === "all") {
      for (const code of rule.courses) {
        slots.push({ label: code, status: best([code]), where: whereOf([code]) });
      }
    } else if (rule.kind === "choose" && rule.courses.length <= 3) {
      slots.push({
        label: rule.courses.join(" or "),
        status: best(rule.courses),
        where: whereOf(rule.courses),
      });
    } else if (rule.kind === "choose" || rule.kind === "either") {
      slots.push({
        label,
        status:
          result.status === "done"
            ? "completed"
            : result.status === "planned"
              ? "planned"
              : "uncovered",
        where: result.progress
          ? `${result.progress.planned} of ${result.progress.target} units in the plan`
          : null,
      });
    }
  });
  return slots;
}

// ---------------------------------------------------------------------------
// The plan check

export interface Problem {
  kind: "requirement" | "order" | "offering" | "load" | "duplicate";
  termId: string | null;
  message: string;
}

/** ANU's maximum load: "You can't study more than four courses (24 units) per semester". */
export const MAX_UNITS_PER_SEMESTER = 24;

/**
 * Everything the plan is missing or has wrong, in the order a person would
 * fix it: unmet degree rules first, then problems inside semesters.
 */
export function checkPlan(
  requirements: RequirementInfo[],
  entries: Entry[],
  courses: Map<string, CourseInfo>,
  terms: TermInfo[],
): { results: RuleResult[]; problems: Problem[] } {
  const results = checkRequirements(requirements, entries, courses, terms);
  const order = termOrder(terms);
  const labels = new Map(terms.map((t) => [t.id, termLabel(t)]));
  const halfOf = new Map(terms.map((t) => [t.id, t.half]));
  const problems: Problem[] = [];

  for (const r of results) {
    if (r.status === "missing" && r.missing) {
      problems.push({ kind: "requirement", termId: null, message: `${r.label}: ${r.missing}.` });
    }
  }

  const byTerm = [...order.keys()];
  for (const termId of byTerm) {
    const index = order.get(termId) ?? 0;
    const here = entries.filter((e) => e.termId === termId);
    const label = labels.get(termId) ?? termId;

    for (const e of here) {
      const course = courses.get(e.code);
      if (!course || e.status === "completed") continue;

      // Placed in a semester it does not run in.
      const half = halfOf.get(termId);
      if ((half === 1 && !course.offeredS1) || (half === 2 && !course.offeredS2)) {
        const runs = course.offeredS1 ? "Semester 1" : course.offeredS2 ? "Semester 2" : "no 2026 semester";
        problems.push({
          kind: "offering",
          termId,
          message: `${e.code} runs in ${runs} only, but it is in ${label}.`,
        });
      }

      // Prerequisites not in place before it.
      if (course.prereq) {
        const before = entries.filter((x) => (order.get(x.termId) ?? 0) < index);
        const alongside = here.filter((x) => x !== e);
        if (!prereqMet(course.prereq, before, alongside, courses)) {
          const later = entries.filter(
            (x) =>
              namedCourses(course.prereq as Prereq).includes(x.code) &&
              (order.get(x.termId) ?? 0) >= index,
          );
          const after = later.length
            ? ` ${listAnd(later.map((x) => `${x.code} is in ${labels.get(x.termId)}`))}, which is not before it.`
            : "";
          problems.push({
            kind: "order",
            termId,
            message: `${e.code} in ${label} needs ${describePrereq(course.prereq)} first.${after}`,
          });
        }
      }
    }

    const load = unitsOf(here, courses);
    if (load > MAX_UNITS_PER_SEMESTER) {
      problems.push({
        kind: "load",
        termId,
        message: `${label} has ${load} units. The most ANU allows in a semester is ${MAX_UNITS_PER_SEMESTER}.`,
      });
    }
  }

  // The same course in more than one semester, unless the rules repeat it.
  const seen = new Map<string, Entry[]>();
  for (const e of entries) seen.set(e.code, [...(seen.get(e.code) ?? []), e]);
  for (const [code, list] of seen) {
    if (list.length > 1 && !courses.get(code)?.repeatable) {
      problems.push({
        kind: "duplicate",
        termId: null,
        message: `${code} is in the plan more than once (${listAnd(list.map((e) => labels.get(e.termId) ?? e.termId))}).`,
      });
    }
  }

  return { results, problems };
}
