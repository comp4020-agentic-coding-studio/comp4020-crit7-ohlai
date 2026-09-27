import type { Prereq, Rule } from "./rules";

// The seed: AACOM's rules and a slice of its catalogue, taken from the 2026
// Programs and Courses handbook. notes/degree-source.md lists every source
// URL and everything simplified here. Change one, change the other.

const PC = "https://programsandcourses.anu.edu.au/2026";
export const PROGRAM_URL = `${PC}/program/AACOM`;
export const SPECIALISATION_URL = `${PC}/specialisation/MACL-SPEC`;

// ---------------------------------------------------------------------------
// Courses

interface SeedCourse {
  code: string;
  title: string;
  units: number;
  s1: boolean;
  s2: boolean;
  prereq?: Prereq;
  prereqText?: string;
  repeatable?: boolean;
}

const c = (code: string): Prereq => ({ course: code });
const any = (...ps: Prereq[]): Prereq => ({ any: ps });
const all = (...ps: Prereq[]): Prereq => ({ all: ps });
const mathUnits = (units: number, level?: number): Prereq => ({ units, subjects: ["MATH"], level });

export const COURSES: SeedCourse[] = [
  // The degree's named courses
  { code: "COMP1100", title: "Programming as Problem Solving", units: 6, s1: true, s2: true,
    prereqText: "Incompatible with COMP1130." },
  { code: "COMP1130", title: "Programming as Problem Solving (Advanced)", units: 6, s1: true, s2: false,
    prereqText: "Incompatible with COMP1100." },
  { code: "COMP1110", title: "Structured Programming", units: 6, s1: true, s2: true,
    prereq: any(c("COMP1100"), c("COMP1130"), c("COMP1730")),
    prereqText: "To enrol in this course you must have completed: COMP1100 OR COMP1130 OR COMP1730." },
  { code: "COMP1140", title: "Structured Programming (Advanced)", units: 6, s1: false, s2: true,
    prereq: c("COMP1130"),
    prereqText: "To enrol in this course you must have successfully completed COMP1130." },
  { code: "MATH1005", title: "Discrete Mathematical Models", units: 6, s1: true, s2: false },
  { code: "MATH2222", title: "Introduction to Mathematical Thinking: Problem-Solving and Proofs", units: 6, s1: true, s2: false },
  { code: "COMP2100", title: "Software Construction", units: 6, s1: true, s2: true,
    prereq: all(any(c("COMP1110"), c("COMP1140")), mathUnits(6, 1000)),
    prereqText: "To enrol in this course you must have successfully completed: COMP1110 or COMP1140 AND 6 units of 1000 level MATH." },
  { code: "COMP2120", title: "Software Engineering", units: 6, s1: false, s2: true,
    prereq: { coreq: "COMP2100" },
    prereqText: "To enrol in this course you must have successfully completed or be currently studying COMP2100." },
  { code: "COMP2300", title: "Computer Architecture", units: 6, s1: true, s2: false,
    prereq: all(any(c("COMP1100"), c("COMP1130"), c("COMP1730")), mathUnits(6, 1000)),
    prereqText: "To enrol in this course you must have completed: (COMP1100 OR COMP1130 OR COMP1730) AND 6 units of 1000-level MATH courses." },
  { code: "COMP2310", title: "Systems, Networks, and Concurrency", units: 6, s1: false, s2: true,
    prereq: all(any(c("COMP1110"), c("COMP1140")), any(c("COMP2300"), c("ENGN2219"))),
    prereqText: "To enrol in this course you must have completed: COMP1110 or COMP1140 AND COMP2300 or ENGN2219." },
  { code: "COMP2400", title: "Relational Databases", units: 6, s1: true, s2: true,
    prereq: any(c("COMP1100"), c("COMP1130"), c("INFS1001"), c("COMP1730")),
    prereqText: "To enrol in this course you must have successfully completed: COMP1100 or COMP1130 or INFS1001 or COMP1730." },
  { code: "COMP3600", title: "Algorithms", units: 6, s1: false, s2: true,
    prereq: all({ units: 24, subjects: ["COMP"] }, any(mathUnits(6), c("COMP1600"))),
    prereqText: "To enrol in this course you must have completed the following: 24 units of COMP coded courses AND (6 units of MATH OR COMP1600)." },
  { code: "COMP3630", title: "Theory of Computation", units: 6, s1: true, s2: false,
    prereq: all({ units: 24, subjects: ["COMP"] }, any(mathUnits(6), c("COMP1600"))),
    prereqText: "To enrol in this course you must have completed: 24 units of COMP coded courses AND (6 units of MATH OR COMP1600)." },
  { code: "COMP4450", title: "Computing Research Methods", units: 6, s1: true, s2: false,
    prereq: { units: 24, subjects: ["COMP"] },
    prereqText: "To enrol in this course you must be enrolled in the Bachelor of Advanced Computing (AACOM) AND have successfully completed 24 units of COMP coded courses." },
  { code: "COMP4500", title: "Software Engineering Team Project", units: 6, s1: true, s2: true, repeatable: true,
    prereq: all(c("COMP2120"), { units: 12, minLevel: 3000 }),
    prereqText: "You must be studying Bachelor of Advanced Computing (AACOM) AND have completed: COMP2120 AND 12 units of 3000 and/or 4000 level courses. Membership of an approved project group is also required." },
  { code: "COMP4550", title: "Computing Research Project", units: 12, s1: true, s2: true, repeatable: true,
    prereq: { coreq: "COMP4450" },
    prereqText: "Have completed or be currently enrolled in COMP4450 AND find a project/supervisor AND have a weighted average mark equivalent to an ANU 70 per cent, and a permission code." },
  { code: "COMP4820", title: "Advanced Computing Internship", units: 12, s1: true, s2: true,
    prereq: all(c("COMP2100"), { units: 12, subjects: ["COMP"], level: 3000 }),
    prereqText: "You must be studying a Bachelor of Advanced Computing AND have successfully completed: COMP2100 AND 12 units of 3000 level COMP courses. Competitive entry, permission code required." },

  // Computing electives, the Machine Learning specialisation and nearby
  { code: "COMP1600", title: "Foundations of Computing", units: 6, s1: false, s2: true,
    prereq: all(mathUnits(6), any(c("COMP1100"), c("COMP1130"))),
    prereqText: "To enrol in this course you must have completed: 6 units of MATH courses and COMP1100 or COMP1130." },
  { code: "COMP2620", title: "Logic", units: 6, s1: true, s2: false,
    prereq: any(mathUnits(6), c("COMP1600")),
    prereqText: "To enrol in this course you must have completed 6 units of MATH courses OR COMP1600." },
  { code: "COMP3300", title: "Operating Systems Implementation", units: 6, s1: false, s2: true,
    prereq: c("COMP2310"),
    prereqText: "To enrol in this course you must have successfully completed COMP2310." },
  { code: "COMP3310", title: "Computer Networks", units: 6, s1: true, s2: false,
    prereq: all(any(c("COMP2100"), c("COMP2300")), { units: 6, subjects: ["COMP"], level: 2000 }),
    prereqText: "To enrol in this course you must have completed COMP2100 or COMP2300 AND 6 units of COMP2000-level courses." },
  { code: "COMP3425", title: "Data Mining", units: 6, s1: true, s2: false,
    prereq: all(any(c("COMP1100"), c("COMP1130"), c("COMP1730")), c("COMP2400")),
    prereqText: "To enrol in this course you must have completed 6 units from COMP1100 or COMP1130 or COMP1730; AND COMP2400." },
  { code: "COMP3620", title: "Artificial Intelligence", units: 6, s1: true, s2: false,
    prereq: all(any(c("COMP1110"), c("COMP1140")), c("COMP2620")),
    prereqText: "To enrol in this course you must have completed: COMP1110/1140 AND COMP2620." },
  { code: "COMP3670", title: "Introduction to Machine Learning", units: 6, s1: false, s2: true,
    prereq: any(c("COMP1110"), c("COMP1140")),
    prereqText: "To enrol in this course you must have completed COMP1110 or COMP1140." },
  { code: "COMP3900", title: "Human-Computer Interaction", units: 6, s1: false, s2: true,
    prereq: { units: 12, subjects: ["COMP"], level: 2000 },
    prereqText: "To enrol in this course you must have completed 12 units of 2000 level COMP courses." },
  { code: "COMP4020", title: "Advanced Topics in Human-Centred and Creative Computing", units: 6, s1: false, s2: true,
    prereq: c("COMP3900"),
    prereqText: "To enrol in this course, you must have completed COMP3900. Permission code required." },
  { code: "COMP4528", title: "Computer Vision", units: 6, s1: true, s2: false,
    prereq: any(c("ENGN2228"), c("COMP2120"), c("COMP3600"), c("COMP3670")),
    prereqText: "To enrol in this course you must have completed either ENGN2228 or COMP2120 or COMP3600 or COMP3670." },
  { code: "COMP4610", title: "Computer Graphics", units: 6, s1: true, s2: false,
    prereq: all(c("COMP2100"), any(c("COMP3600"), c("COMP3540"), c("COMP3900"), c("COMP3320"))),
    prereqText: "To enrol in this course you must have completed: COMP2100 AND 6 units of (COMP3600 OR COMP3540 OR COMP3900 OR COMP3320)." },
  { code: "COMP4620", title: "Advanced Topics in Artificial Intelligence", units: 6, s1: false, s2: true,
    prereq: { units: 12, subjects: ["COMP"], minLevel: 3000 },
    prereqText: "12 units of 3000 and/or 4000 level COMP courses. Permission code required." },
  { code: "COMP4650", title: "Document Analysis", units: 6, s1: false, s2: true,
    prereq: all(any(c("COMP1600"), c("COMP2100")), { units: 12, subjects: ["COMP", "INFS"], minLevel: 3000 }),
    prereqText: "To enrol in this course you must have completed: (COMP1600 OR COMP2100) AND 12 units of 3000/4000 level (COMP OR INFS courses)." },
  { code: "COMP4670", title: "Statistical Machine Learning", units: 6, s1: true, s2: false,
    prereq: any(c("COMP3670"), all(any(c("COMP1110"), c("COMP1140")), any(c("MATH1014"), c("MATH1115"), c("MATH1116")))),
    prereqText: "To enrol in this course you must have completed: COMP3670 OR (COMP1110/COMP1140 AND MATH1014 OR MATH1115 OR MATH1116)." },
  { code: "COMP4680", title: "Advanced Topics in Machine Learning", units: 6, s1: true, s2: false,
    prereq: { units: 12, subjects: ["COMP"], minLevel: 3000 },
    prereqText: "12 units of 3000 and/or 4000 level COMP courses. Permission code required." },
  { code: "COMP4691", title: "Optimisation", units: 6, s1: false, s2: true,
    prereq: all(c("COMP3620"), any(c("MATH1013"), c("MATH1115"))),
    prereqText: "To enrol in this course you must have completed COMP3620 and have completed MATH1013 or MATH1115." },
  { code: "COMP4712", title: "Compiler Construction", units: 6, s1: true, s2: false,
    prereq: all(c("COMP2100"), c("COMP2310"), { units: 6, subjects: ["COMP"], minLevel: 3000 }),
    prereqText: "To enrol in this course you must have completed: COMP2100 AND COMP2310 AND 6 units of 3000 and/or 4000 level COMP courses." },

  // The ICT list and university electives
  { code: "MATH1013", title: "Mathematics and Applications 1", units: 6, s1: true, s2: true,
    prereqText: "Not with MATH1113 or MATH1115." },
  { code: "MATH1014", title: "Mathematics and Applications 2", units: 6, s1: true, s2: true,
    prereq: any(c("MATH1013"), c("MATH1115"), c("MATH1113")),
    prereqText: "To enrol in this course you must have completed MATH1013 or MATH1115 or MATH1113." },
  { code: "MATH1115", title: "Advanced Mathematics and Applications 1", units: 6, s1: true, s2: false },
  { code: "MATH2301", title: "Games, Graphs and Machines", units: 6, s1: false, s2: true,
    prereq: any(c("MATH1005"), c("MATH1013"), c("MATH1113"), c("MATH1115")),
    prereqText: "To enrol in this course you must have completed MATH1005, MATH1013, MATH1113, or MATH1115." },
  { code: "STAT1008", title: "Quantitative Research Methods", units: 6, s1: true, s2: true,
    prereqText: "Incompatible with STAT1003." },
  { code: "INFS2024", title: "Information Systems Analysis", units: 6, s1: true, s2: false,
    prereq: any(c("INFS1001"), c("COMP1100"), c("COMP1710"), c("COMP1720")),
    prereqText: "To enrol in this course, you must have completed at least one of: INFS1001, COMP1100, COMP1710, COMP1720." },
  { code: "SOCY2166", title: "Social Science of the Internet", units: 6, s1: true, s2: false,
    prereq: any({ units: 12, subjects: ["COMP", "STAT"] }, { units: 12, subjects: ["CRIM", "POLS", "SOCR", "SOCY"] }),
    prereqText: "To enrol in this course you must have completed: 12 units of COMP or STAT courses, OR 12 units of CRIM, POLS, SOCR or SOCY courses. SOCY2038 must be completed first or studied alongside." },
  { code: "ECON1101", title: "Microeconomics 1", units: 6, s1: true, s2: true },
];

export const courseUrl = (code: string) => `${PC}/course/${code}`;

// ---------------------------------------------------------------------------
// Requirements: AACOM's "Program Requirements", in order

const ICT_LIST = [
  "ARTH2181", "ASIA3032", "DESN2010", "ENGN1211", "ENVS2015", "INFS2024", "INFS3002",
  "INFS3024", "MATH1013", "MATH1115", "MATH2301", "MATH2307", "MGMT2009", "MUSI3309",
  "SCOM3029", "SOCY2038", "SOCY2166", "STAT1003", "STAT1008",
];

const further4000: Rule = { kind: "pool", units: 12, subjects: ["COMP"], minLevel: 4000 };

export const REQUIREMENTS: { label: string; rule: Rule; source: string }[] = [
  { label: "192 units in total", rule: { kind: "total", units: 192 }, source: PROGRAM_URL },
  { label: "At most 60 units of 1000-level courses", rule: { kind: "max", units: 60, level: 1000 }, source: PROGRAM_URL },
  { label: "At least 48 units of 4000-level COMP", rule: { kind: "min", units: 48, subjects: ["COMP"], level: 4000 }, source: PROGRAM_URL },
  { label: "Programming as Problem Solving", rule: { kind: "choose", units: 6, courses: ["COMP1100", "COMP1130"] }, source: PROGRAM_URL },
  { label: "Structured Programming", rule: { kind: "choose", units: 6, courses: ["COMP1110", "COMP1140"] }, source: PROGRAM_URL },
  { label: "Discrete maths", rule: { kind: "choose", units: 6, courses: ["MATH1005", "MATH2222"] }, source: PROGRAM_URL },
  {
    label: "Compulsory courses",
    rule: { kind: "all", courses: ["COMP2100", "COMP2120", "COMP2300", "COMP2310", "COMP2400", "COMP3600", "COMP3630", "COMP4450"] },
    source: PROGRAM_URL,
  },
  {
    label: "Machine Learning specialisation",
    rule: { kind: "choose", units: 24, courses: ["COMP3670", "COMP4528", "COMP4650", "COMP4670", "COMP4680"], min4000: 12 },
    source: SPECIALISATION_URL,
  },
  { label: "ICT-related courses", rule: { kind: "choose", units: 12, courses: ICT_LIST }, source: PROGRAM_URL },
  {
    label: "Capstone",
    rule: {
      kind: "either",
      options: [
        { label: "Research project", rules: [{ kind: "twice", course: "COMP4550" }] },
        { label: "Team project", rules: [{ kind: "twice", course: "COMP4500" }, further4000] },
        { label: "Internship", rules: [{ kind: "all", courses: ["COMP4820"] }, further4000] },
      ],
    },
    source: PROGRAM_URL,
  },
  { label: "3000/4000-level COMP electives", rule: { kind: "pool", units: 18, subjects: ["COMP"], minLevel: 3000 }, source: PROGRAM_URL },
];

// ---------------------------------------------------------------------------
// Semesters and enrolment windows

// Canberra is UTC+11 in summer and UTC+10 in winter. The dates are my
// approximation of ANU's calendar, not taken from it: see the notes.
const at = (date: string, hour: number, offset: 10 | 11) =>
  new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+${offset}:00`).toISOString();

export function seedTerms() {
  const terms = [];
  for (const year of [2025, 2026, 2027, 2028]) {
    terms.push({
      id: `${year}-S1`, year, half: 1,
      startsOn: `${year}-02-23`, endsOn: `${year}-06-12`,
      enrolmentOpensAt: at(`${year - 1}-11-30`, 9, 11),
      enrolmentClosesAt: at(`${year}-03-06`, 23, 11),
    });
    terms.push({
      id: `${year}-S2`, year, half: 2,
      startsOn: `${year}-07-20`, endsOn: `${year}-11-06`,
      enrolmentOpensAt: at(`${year}-05-25`, 9, 10),
      enrolmentClosesAt: at(`${year}-08-07`, 23, 10),
    });
  }
  return terms;
}

// ---------------------------------------------------------------------------
// Me

export const STUDENT = {
  id: 1,
  name: "Oli",
  uniId: "u7000001",
  programCode: "AACOM",
  specialisation: "Machine Learning",
};

/** Courses done and underway, as of Semester 2 2026. */
export const HISTORY: { termId: string; code: string; status: "completed" | "enrolled" }[] = [
  ...["COMP1100", "MATH1005", "MATH1013", "ECON1101"].map((code) => ({ termId: "2025-S1", code, status: "completed" as const })),
  ...["COMP1110", "COMP1600", "MATH1014", "COMP2400"].map((code) => ({ termId: "2025-S2", code, status: "completed" as const })),
  ...["COMP2100", "COMP2300", "COMP2620", "STAT1008"].map((code) => ({ termId: "2026-S1", code, status: "completed" as const })),
  ...["COMP2120", "COMP2310", "COMP3600", "COMP3670"].map((code) => ({ termId: "2026-S2", code, status: "enrolled" as const })),
];

/** The plan as it stands: next year laid out, the year after not yet. */
export const PLAN: { termId: string; code: string }[] = [
  ...["COMP3630", "COMP4450", "COMP4670", "COMP3310"].map((code) => ({ termId: "2027-S1", code })),
  ...["COMP3900", "COMP4620", "COMP3300", "COMP4500"].map((code) => ({ termId: "2027-S2", code })),
];
