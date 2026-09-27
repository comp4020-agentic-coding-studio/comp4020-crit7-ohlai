import { and, eq } from "drizzle-orm";
import { courseMap, db, listEnrolments, listTerms, STUDENT_ID } from "./db";
import {
  type CourseInfo,
  describePrereq,
  type Entry,
  MAX_UNITS_PER_SEMESTER,
  prereqMet,
  termLabel,
  termOrder,
} from "./rules";
import { enrolments, type Term, terms } from "./schema";
import { formatWhen } from "./view";

// Enrolment, as ISIS does it: unlike the plan, it refuses what is not
// allowed, and says why. Manual enrolment and auto-enrol both go through
// canEnrol, so they can never disagree about what is allowed.

export type EnrolCheck = { ok: true } | { ok: false; reason: string };

export function windowState(term: Term, now: Date): "before" | "open" | "after" {
  const iso = now.toISOString();
  if (iso < term.enrolmentOpensAt) return "before";
  if (iso >= term.enrolmentClosesAt) return "after";
  return "open";
}

export function openTerms(now = new Date()): Term[] {
  return listTerms().filter((t) => windowState(t, now) === "open");
}

// Executor: the database, or a transaction on it.
type Exec = Pick<typeof db, "select" | "insert" | "delete" | "update">;

export function canEnrol(
  termId: string,
  code: string,
  now: Date,
  exec: Exec = db,
  courses: Map<string, CourseInfo> = courseMap(),
  studentId = STUDENT_ID,
): EnrolCheck {
  const all = exec.select().from(terms).all();
  const term = all.find((t) => t.id === termId);
  if (!term) return { ok: false, reason: `There is no semester ${termId}.` };
  const label = termLabel(term);
  const course = courses.get(code);
  if (!course) return { ok: false, reason: `${code} is not in the catalogue.` };

  const state = windowState(term, now);
  if (state === "before") {
    return { ok: false, reason: `Enrolment for ${label} opens ${formatWhen(term.enrolmentOpensAt)}.` };
  }
  if (state === "after") return { ok: false, reason: `Enrolment for ${label} has closed.` };

  if ((term.half === 1 && !course.offeredS1) || (term.half === 2 && !course.offeredS2)) {
    return { ok: false, reason: `${code} does not run in Semester ${term.half}.` };
  }

  const mine = exec.select().from(enrolments).where(eq(enrolments.studentId, studentId)).all();
  const labels = new Map(all.map((t) => [t.id, termLabel(t)]));
  if (mine.some((e) => e.termId === termId && e.courseCode === code)) {
    return { ok: false, reason: `You are already enrolled in ${code} for ${label}.` };
  }
  const earlier = mine.find((e) => e.courseCode === code);
  if (earlier && !course.repeatable) {
    const verb = earlier.status === "completed" ? "completed" : "are enrolled in";
    return { ok: false, reason: `You ${verb} ${code} in ${labels.get(earlier.termId)}.` };
  }

  // Prerequisites count what is completed or enrolled in earlier semesters.
  // Planned courses do not count: ISIS only knows what you have enrolled in.
  if (course.prereq) {
    const order = termOrder(all);
    const index = order.get(termId) ?? 0;
    const asEntry = (e: (typeof mine)[number]): Entry => ({
      code: e.courseCode,
      termId: e.termId,
      status: e.status,
    });
    const before = mine.filter((e) => (order.get(e.termId) ?? 0) < index).map(asEntry);
    const alongside = mine.filter((e) => e.termId === termId).map(asEntry);
    if (!prereqMet(course.prereq, before, alongside, courses)) {
      return {
        ok: false,
        reason: `${code} needs ${describePrereq(course.prereq)} completed or enrolled before ${label}.`,
      };
    }
  }

  const load = mine
    .filter((e) => e.termId === termId)
    .reduce((s, e) => s + (courses.get(e.courseCode)?.units ?? 0), 0);
  if (load + course.units > MAX_UNITS_PER_SEMESTER) {
    return {
      ok: false,
      reason: `${code} would take ${label} to ${load + course.units} units. The most ANU allows is ${MAX_UNITS_PER_SEMESTER}.`,
    };
  }
  return { ok: true };
}

export function enrol(
  termId: string,
  code: string,
  source: "manual" | "auto",
  now = new Date(),
  exec: Exec = db,
): EnrolCheck {
  const check = canEnrol(termId, code, now, exec);
  if (!check.ok) return check;
  exec
    .insert(enrolments)
    .values({ studentId: STUDENT_ID, termId, courseCode: code, status: "enrolled", source })
    .onConflictDoNothing()
    .run();
  return { ok: true };
}

/** Drops an enrolment. Only while the window is open, and never a completed course. */
export function drop(termId: string, code: string, now = new Date()): EnrolCheck {
  const term = listTerms().find((t) => t.id === termId);
  if (!term) return { ok: false, reason: `There is no semester ${termId}.` };
  if (windowState(term, now) !== "open") {
    return { ok: false, reason: `Enrolment for ${termLabel(term)} is not open, so it cannot change.` };
  }
  const where = and(
    eq(enrolments.studentId, STUDENT_ID),
    eq(enrolments.termId, termId),
    eq(enrolments.courseCode, code),
    eq(enrolments.status, "enrolled"),
  );
  const found = db.select().from(enrolments).where(where).get();
  if (!found) return { ok: false, reason: `You are not enrolled in ${code} for ${termLabel(term)}.` };
  db.delete(enrolments).where(where).run();
  return { ok: true };
}

export { listEnrolments };
