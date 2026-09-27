import { and, asc, desc, eq, isNull, lte, gt } from "drizzle-orm";
import { db, STUDENT_ID } from "./db";
import { canEnrol } from "./enrol";
import { termLabel } from "./rules";
import { autoEnrol, enrolmentLog, enrolments, planEntries, terms } from "./schema";
import { formatWhen } from "./view";

// Auto-enrol with no timer. The machine sleeps when idle, so nothing can
// wait for a window to open. Instead every request asks: has a window
// opened, for a semester with auto-enrol on, that has not been processed?
// If so it is processed now, inside one transaction that also stamps it
// processed, so a second request finds nothing to do. The unique index on
// enrolments is the second guard: the same course cannot be inserted twice.

export function processOpenWindows(now = new Date(), studentId = STUDENT_ID): number {
  const iso = now.toISOString();
  const due = () =>
    db
      .select({ termId: autoEnrol.termId })
      .from(autoEnrol)
      .innerJoin(terms, eq(terms.id, autoEnrol.termId))
      .where(
        and(
          eq(autoEnrol.studentId, studentId),
          eq(autoEnrol.enabled, true),
          isNull(autoEnrol.processedAt),
          lte(terms.enrolmentOpensAt, iso),
          gt(terms.enrolmentClosesAt, iso),
        ),
      )
      .all();

  // The cheap check every request pays. Almost always empty.
  if (due().length === 0) return 0;

  let enrolled = 0;
  db.transaction((tx) => {
    for (const { termId } of due()) {
      const term = tx.select().from(terms).where(eq(terms.id, termId)).get();
      if (!term) continue;
      const planned = tx
        .select()
        .from(planEntries)
        .where(and(eq(planEntries.studentId, studentId), eq(planEntries.termId, termId)))
        .orderBy(asc(planEntries.id))
        .all();
      const log = (courseCode: string | null, outcome: "enrolled" | "skipped" | "opened", detail: string) =>
        tx.insert(enrolmentLog).values({ studentId, termId, courseCode, outcome, detail }).run();

      log(null, "opened", `Enrolment for ${termLabel(term)} opened ${formatWhen(term.enrolmentOpensAt)}. Enrolling from the plan.`);
      for (const entry of planned) {
        const already = tx
          .select()
          .from(enrolments)
          .where(
            and(
              eq(enrolments.studentId, studentId),
              eq(enrolments.termId, termId),
              eq(enrolments.courseCode, entry.courseCode),
            ),
          )
          .get();
        if (already) continue;
        const check = canEnrol(termId, entry.courseCode, now, tx);
        if (check.ok) {
          tx.insert(enrolments)
            .values({ studentId, termId, courseCode: entry.courseCode, status: "enrolled", source: "auto" })
            .onConflictDoNothing()
            .run();
          log(entry.courseCode, "enrolled", `Enrolled in ${entry.courseCode} from the plan.`);
          enrolled++;
        } else {
          log(entry.courseCode, "skipped", `Did not enrol in ${entry.courseCode}: ${check.reason}`);
        }
      }
      tx.update(autoEnrol)
        .set({ processedAt: iso })
        .where(and(eq(autoEnrol.studentId, studentId), eq(autoEnrol.termId, termId)))
        .run();
    }
  });
  return enrolled;
}

/**
 * Turns "enrol me from my plan" on or off for a semester. Turning it on
 * marks the semester unprocessed, so a plan changed after an earlier run is
 * picked up on the next request if the window is open. That cannot double
 * enrol: courses already enrolled are skipped.
 */
export function setAutoEnrol(termId: string, enabled: boolean, studentId = STUDENT_ID) {
  db.insert(autoEnrol)
    .values({ studentId, termId, enabled, processedAt: null })
    .onConflictDoUpdate({
      target: [autoEnrol.studentId, autoEnrol.termId],
      set: enabled ? { enabled, processedAt: null } : { enabled },
    })
    .run();
}

export function autoEnrolFor(studentId = STUDENT_ID) {
  return new Map(
    db
      .select()
      .from(autoEnrol)
      .where(eq(autoEnrol.studentId, studentId))
      .all()
      .map((a) => [a.termId, a]),
  );
}

export function logFor(termId: string, studentId = STUDENT_ID) {
  return db
    .select()
    .from(enrolmentLog)
    .where(and(eq(enrolmentLog.studentId, studentId), eq(enrolmentLog.termId, termId)))
    .orderBy(desc(enrolmentLog.id))
    .limit(30)
    .all();
}

// ---------------------------------------------------------------------------
// The demo control. Not an ISIS feature: it exists so auto-enrol can be
// shown working at the crit without waiting until 30 November.

export function demoOpenWindow(termId: string, delaySeconds: number, now = new Date()) {
  const term = db.select().from(terms).where(eq(terms.id, termId)).get();
  if (!term) return false;
  const opensAt = new Date(now.getTime() + delaySeconds * 1000).toISOString();
  db.update(terms).set({ enrolmentOpensAt: opensAt }).where(eq(terms.id, termId)).run();
  return true;
}

/** Puts the real date back and undoes what was enrolled in that window. */
export function demoReset(termId: string, studentId = STUDENT_ID) {
  db.transaction((tx) => {
    const term = tx.select().from(terms).where(eq(terms.id, termId)).get();
    if (!term) return;
    tx.update(terms).set({ enrolmentOpensAt: term.seededOpensAt }).where(eq(terms.id, termId)).run();
    tx.delete(enrolments)
      .where(
        and(
          eq(enrolments.studentId, studentId),
          eq(enrolments.termId, termId),
          eq(enrolments.status, "enrolled"),
        ),
      )
      .run();
    tx.delete(enrolmentLog)
      .where(and(eq(enrolmentLog.studentId, studentId), eq(enrolmentLog.termId, termId)))
      .run();
    tx.update(autoEnrol)
      .set({ processedAt: null })
      .where(and(eq(autoEnrol.studentId, studentId), eq(autoEnrol.termId, termId)))
      .run();
  });
}
