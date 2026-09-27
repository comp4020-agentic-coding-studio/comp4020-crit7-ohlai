import { sql } from "drizzle-orm";
import { int, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both. The migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

export const messages = sqliteTable("messages", {
  id: int().primaryKey({ autoIncrement: true }),
  body: text().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Message = typeof messages.$inferSelect;

// One row, hardcoded. There is no login: this app is my own planner.
export const students = sqliteTable("students", {
  id: int().primaryKey(),
  name: text().notNull(),
  uniId: text("uni_id").notNull(),
  programCode: text("program_code").notNull(),
  specialisation: text().notNull(),
});

// The course catalogue, seeded from Programs and Courses. `prereq` is the
// P&C requisite rule as a JSON expression (see src/lib/rules.ts), and
// `prereqText` is P&C's own wording, kept so the app can show it.
export const courses = sqliteTable("courses", {
  code: text().primaryKey(),
  title: text().notNull(),
  units: int().notNull(),
  offeredS1: int("offered_s1", { mode: "boolean" }).notNull(),
  offeredS2: int("offered_s2", { mode: "boolean" }).notNull(),
  prereq: text(),
  prereqText: text("prereq_text"),
  // A course the degree rules say is taken twice, like COMP4500.
  repeatable: int({ mode: "boolean" }).notNull().default(false),
  sourceUrl: text("source_url").notNull(),
});

// Semesters. Enrolment windows live here, not in a timer: any window whose
// `enrolment_opens_at` has passed is processed on the next request.
// `seeded_opens_at` is the real date, kept so the demo control can put a
// window back after opening it early. Times are UTC ISO strings.
export const terms = sqliteTable("terms", {
  id: text().primaryKey(), // "2027-S1"
  year: int().notNull(),
  half: int().notNull(), // 1 or 2
  startsOn: text("starts_on").notNull(),
  endsOn: text("ends_on").notNull(),
  enrolmentOpensAt: text("enrolment_opens_at").notNull(),
  enrolmentClosesAt: text("enrolment_closes_at").notNull(),
  seededOpensAt: text("seeded_opens_at").notNull(),
});

// The degree's requirements, in the order they are checked. `rule` is JSON
// (see src/lib/rules.ts). Order matters: a rule that names courses claims
// them, and a later rule cannot count a course an earlier one claimed.
export const requirements = sqliteTable("requirements", {
  id: int().primaryKey(),
  programCode: text("program_code").notNull(),
  position: int().notNull(),
  label: text().notNull(),
  rule: text().notNull(),
  sourceUrl: text("source_url").notNull(),
});

export const planEntries = sqliteTable(
  "plan_entries",
  {
    id: int().primaryKey({ autoIncrement: true }),
    studentId: int("student_id").notNull(),
    termId: text("term_id").notNull(),
    courseCode: text("course_code").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("plan_entries_student_term_course").on(t.studentId, t.termId, t.courseCode)],
);

// What ISIS would hold. The unique index is what makes auto-enrol safe to
// run twice: a second insert of the same course in the same term is a no-op.
export const enrolments = sqliteTable(
  "enrolments",
  {
    id: int().primaryKey({ autoIncrement: true }),
    studentId: int("student_id").notNull(),
    termId: text("term_id").notNull(),
    courseCode: text("course_code").notNull(),
    status: text({ enum: ["completed", "enrolled"] }).notNull(),
    source: text({ enum: ["history", "manual", "auto"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("enrolments_student_term_course").on(t.studentId, t.termId, t.courseCode)],
);

// "Enrol me from my plan", per semester. `processed_at` is set in the same
// transaction as the enrolments it made, so a window is processed once.
export const autoEnrol = sqliteTable(
  "auto_enrol",
  {
    studentId: int("student_id").notNull(),
    termId: text("term_id").notNull(),
    enabled: int({ mode: "boolean" }).notNull().default(false),
    processedAt: text("processed_at"),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.termId] })],
);

// What auto-enrol did and why, so a skipped course is never silent.
export const enrolmentLog = sqliteTable("enrolment_log", {
  id: int().primaryKey({ autoIncrement: true }),
  studentId: int("student_id").notNull(),
  termId: text("term_id").notNull(),
  courseCode: text("course_code"),
  outcome: text({ enum: ["enrolled", "skipped", "opened"] }).notNull(),
  detail: text().notNull(),
  createdAt: createdAt(),
});

export type Student = typeof students.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Term = typeof terms.$inferSelect;
export type Requirement = typeof requirements.$inferSelect;
export type PlanEntry = typeof planEntries.$inferSelect;
export type Enrolment = typeof enrolments.$inferSelect;
export type AutoEnrol = typeof autoEnrol.$inferSelect;
export type LogEntry = typeof enrolmentLog.$inferSelect;
