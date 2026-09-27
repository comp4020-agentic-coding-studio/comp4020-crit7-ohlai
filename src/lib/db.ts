import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { CourseInfo, Entry, Prereq, RequirementInfo, Rule, TermInfo } from "./rules";
import {
  type Course,
  courses,
  enrolments,
  type Message,
  messages,
  planEntries,
  requirements,
  students,
  type Term,
  terms,
} from "./schema";
import { COURSES, courseUrl, HISTORY, PLAN, REQUIREMENTS, STUDENT, seedTerms } from "./seed";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume: the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

seed();

// The seed runs at every boot. Reference data (courses, requirements,
// semesters) is upserted, so a correction to src/lib/seed.ts reaches the
// deployed database on the next deploy. My own record, history and starting
// plan go in once, when there is no student yet, and are mine after that.
// A semester's enrolment window is only written on insert: the demo control
// moves it, and a redeploy must not quietly move it back.
function seed() {
  db.transaction((tx) => {
    for (const course of COURSES) {
      const row = {
        code: course.code,
        title: course.title,
        units: course.units,
        offeredS1: course.s1,
        offeredS2: course.s2,
        prereq: course.prereq ? JSON.stringify(course.prereq) : null,
        prereqText: course.prereqText ?? null,
        repeatable: course.repeatable ?? false,
        sourceUrl: courseUrl(course.code),
      };
      tx.insert(courses).values(row).onConflictDoUpdate({ target: courses.code, set: row }).run();
    }

    REQUIREMENTS.forEach((r, i) => {
      const row = {
        id: i + 1,
        programCode: STUDENT.programCode,
        position: i + 1,
        label: r.label,
        rule: JSON.stringify(r.rule),
        sourceUrl: r.source,
      };
      tx.insert(requirements).values(row).onConflictDoUpdate({ target: requirements.id, set: row }).run();
    });
    tx.delete(requirements).where(sql`${requirements.id} > ${REQUIREMENTS.length}`).run();

    for (const t of seedTerms()) {
      tx.insert(terms)
        .values({ ...t, seededOpensAt: t.enrolmentOpensAt })
        .onConflictDoUpdate({
          target: terms.id,
          set: {
            startsOn: t.startsOn,
            endsOn: t.endsOn,
            enrolmentClosesAt: t.enrolmentClosesAt,
            seededOpensAt: t.enrolmentOpensAt,
          },
        })
        .run();
    }

    const existing = tx.select().from(students).where(eq(students.id, STUDENT.id)).get();
    if (!existing) {
      tx.insert(students).values(STUDENT).run();
      for (const h of HISTORY) {
        tx.insert(enrolments)
          .values({ studentId: STUDENT.id, termId: h.termId, courseCode: h.code, status: h.status, source: "history" })
          .run();
      }
      for (const p of PLAN) {
        tx.insert(planEntries).values({ studentId: STUDENT.id, termId: p.termId, courseCode: p.code }).run();
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Reads

export const STUDENT_ID = STUDENT.id;

export function getStudent() {
  const student = db.select().from(students).where(eq(students.id, STUDENT_ID)).get();
  if (!student) throw new Error("the seeded student is missing");
  return student;
}

export function listTerms(): Term[] {
  return db.select().from(terms).orderBy(terms.year, terms.half).all();
}

export function listCourses(): Course[] {
  return db.select().from(courses).orderBy(courses.code).all();
}

export function toCourseInfo(c: Course): CourseInfo {
  return {
    code: c.code,
    title: c.title,
    units: c.units,
    offeredS1: c.offeredS1,
    offeredS2: c.offeredS2,
    prereq: c.prereq ? (JSON.parse(c.prereq) as Prereq) : null,
    repeatable: c.repeatable,
  };
}

export function courseMap(): Map<string, CourseInfo> {
  return new Map(listCourses().map((c) => [c.code, toCourseInfo(c)]));
}

export function listRequirements(): RequirementInfo[] {
  return db
    .select()
    .from(requirements)
    .where(eq(requirements.programCode, getStudent().programCode))
    .orderBy(requirements.position)
    .all()
    .map((r) => ({ id: r.id, label: r.label, rule: JSON.parse(r.rule) as Rule }));
}

export function termInfo(t: Term): TermInfo {
  return { id: t.id, year: t.year, half: t.half };
}

export function listEnrolments(studentId = STUDENT_ID) {
  return db.select().from(enrolments).where(eq(enrolments.studentId, studentId)).all();
}

/**
 * The plan as one list: every enrolment (completed or enrolled), plus every
 * plan entry that is not enrolled yet, as planned. A course enrolled from
 * the plan stays in the plan; its status just moves on.
 */
export function listEntries(studentId = STUDENT_ID): Entry[] {
  const enrolled = listEnrolments(studentId);
  const has = new Set(enrolled.map((e) => `${e.termId}:${e.courseCode}`));
  const planned = db
    .select()
    .from(planEntries)
    .where(eq(planEntries.studentId, studentId))
    .orderBy(planEntries.id)
    .all()
    .filter((p) => !has.has(`${p.termId}:${p.courseCode}`));
  return [
    ...enrolled.map((e) => ({ code: e.courseCode, termId: e.termId, status: e.status })),
    ...planned.map((p) => ({ code: p.courseCode, termId: p.termId, status: "planned" as const })),
  ];
}

export function listPlanEntries(termId: string, studentId = STUDENT_ID) {
  return db
    .select()
    .from(planEntries)
    .where(and(eq(planEntries.studentId, studentId), eq(planEntries.termId, termId)))
    .orderBy(planEntries.id)
    .all();
}

// ---------------------------------------------------------------------------
// The plan

export type PlanResult = { ok: true } | { ok: false; reason: string };

/**
 * Puts a course in a semester of the plan. The plan takes anything real: a
 * course in the wrong semester or before its prerequisites is allowed in and
 * flagged by the plan check, because a draft plan is allowed to be wrong.
 */
export function addPlanEntry(termId: string, code: string, studentId = STUDENT_ID): PlanResult {
  const term = db.select().from(terms).where(eq(terms.id, termId)).get();
  if (!term) return { ok: false, reason: `There is no semester ${termId}.` };
  const course = db.select().from(courses).where(eq(courses.code, code)).get();
  if (!course) return { ok: false, reason: `${code} is not in the catalogue.` };
  db.insert(planEntries).values({ studentId, termId, courseCode: code }).onConflictDoNothing().run();
  return { ok: true };
}

export function removePlanEntry(termId: string, code: string, studentId = STUDENT_ID) {
  db.delete(planEntries)
    .where(
      and(
        eq(planEntries.studentId, studentId),
        eq(planEntries.termId, termId),
        eq(planEntries.courseCode, code),
      ),
    )
    .run();
}

// ---------------------------------------------------------------------------
// The starter's guestbook, until the plan page replaces it

export type { Message };

export function listMessages(): Message[] {
  return db.select().from(messages).orderBy(desc(messages.id)).limit(50).all();
}

export function addMessage(body: string): Message {
  return db.insert(messages).values({ body }).returning().get();
}
