# Where the degree data comes from

Everything in `src/lib/seed.ts` is taken from the 2026 Programs and Courses
handbook, fetched on 28 September 2026. This file lists the sources and every
place the app is simpler than the real rules. If the seed changes, this file
changes in the same commit.

## Sources

- Program: [Bachelor of Advanced Computing (Honours), AACOM](https://programsandcourses.anu.edu.au/2026/program/AACOM).
  The "Program Requirements" section is the source of every degree rule. The
  "can't study more than four courses (24 units) per semester" limit is from
  the Study Options tab of the same page.
- Specialisation: [Machine Learning, MACL-SPEC](https://programsandcourses.anu.edu.au/2026/specialisation/MACL-SPEC).
  The other four were read too
  ([ARIN](https://programsandcourses.anu.edu.au/2026/specialisation/ARIN-SPEC),
  [HCCC](https://programsandcourses.anu.edu.au/2026/specialisation/HCCC-SPEC),
  [SYAR](https://programsandcourses.anu.edu.au/2026/specialisation/SYAR-SPEC),
  [THCS](https://programsandcourses.anu.edu.au/2026/specialisation/THCS-SPEC))
  but only Machine Learning is modelled.
- Courses: each course's own page,
  `https://programsandcourses.anu.edu.au/2026/course/<CODE>`. The title, unit
  value, "Offered in" line and "Requisite and Incompatibility" text come from
  there. The app stores the source URL on every course row and links it.

## The rules as modelled

In the order the app checks them. A rule that names courses claims the ones it
counts, so a later rule cannot count them again.

| Rule in the app | P&C wording |
| --- | --- |
| 192 units in total | "requires completion of 192 units" |
| At most 60 units of 1000-level courses | "A maximum of 60 units may come from completion of 1000-level courses" |
| At least 48 units of 4000-level COMP | "A minimum of 48 units that come from the completion of 4000-level courses from the subject area COMP" |
| COMP1100 or COMP1130 | "6 units from completion of a course from the following list" |
| COMP1110 or COMP1140 | as above |
| MATH1005 or MATH2222 | as above |
| Compulsory courses | "48 units from completion of compulsory courses": COMP2100, COMP2120, COMP2300, COMP2310, COMP2400, COMP3600, COMP3630, COMP4450 |
| Machine Learning specialisation | MACL-SPEC: 24 units from COMP3670, COMP4528, COMP4650, COMP4670, COMP4680, at least 12 of them at 4000 level |
| ICT-related courses | "12 units from completion of Information and Communications Technology-related courses from the following list" (all 19 codes kept, even the ones not in the catalogue) |
| Capstone | "Either" COMP4550 twice in consecutive semesters, OR COMP4500 twice in consecutive semesters AND 12 further units of 4000-level COMP, OR COMP4820 AND 12 further units of 4000-level COMP |
| 3000/4000-level COMP electives | "18 units from the completion of 3000 or 4000-level courses from the subject area COMP" |

## What is simpler than the real thing

- **Transdisciplinary Problem-Solving (12 units) is left out.** P&C tags
  courses as TD, but the tags are not on the course pages in a form I could
  read reliably, and the AACOM advice page says "by following your degree
  rules you will meet your TD program requirement".
- **The 48 units of electives are not a separate rule.** They are whatever is
  left of the 192 once the named rules are met, so the 192-unit total covers
  them.
- **One specialisation.** The student has declared Machine Learning. The other
  four specialisations are real but not modelled.
- **Claiming is greedy.** Each rule takes the earliest courses that fit, in
  rule order. A person could sometimes find a better allocation by hand. The
  real audit is done by a person in the college, not by a formula on P&C.
- **Offerings repeat every year.** Each course runs in the semesters its 2026
  page lists, and the app assumes the same pattern in 2027 and 2028. Summer,
  winter, autumn and spring sessions are ignored.
- **Courses with no 2026 offering are left out** of the catalogue (COMP4300,
  COMP3610, COMP4350, COMP3540, COMP1710, COMP1720), because the app could
  not say when they run.
- **Prerequisites keep the course and unit rules and drop the rest.** Dropped:
  permission codes, program enrolment conditions ("must be studying AACOM" is
  always true here), COMP4550's 70 per cent weighted average, COMP4500's
  approved project group, and "excluding MATH1003". Incompatibilities are shown
  as text, not enforced. Courses a prerequisite names but the catalogue lacks
  (COMP1730, ENGN2219, INFS1001 and so on) can never be met by this student,
  which is true of them anyway.
- **COMP4670's requisite is ambiguous on P&C**: "COMP3670 OR (COMP1110/COMP1140
  AND MATH1014 OR MATH1115 OR MATH1116)". It is read as COMP3670, or one of
  COMP1110/COMP1140 together with one of the three MATH courses.
- **"6 units of MATH courses"** is read as any MATH course, and "6 units of
  1000 level MATH" as 1000-level MATH only.
- **A course taken "twice, in consecutive semesters"** is two entries in back
  to back semesters. Only COMP4500 and COMP4550 may appear twice.

## What is made up

- **The student.** "Oli", u7000001, started in 2025, with a completed history
  that satisfies every prerequisite on P&C. The student number is not real.
- **Semester dates and enrolment windows.** Semester 1 runs 23 Feb to 12 Jun
  and Semester 2 runs 20 Jul to 6 Nov. Enrolment for Semester 1 opens 30
  November of the year before, at 9am Canberra time, and Semester 2 opens 25
  May. Both close on the last day to add a course, taken as 6 March and 7
  August. These are my approximations of the ANU calendar, not copied from
  it. In real ISIS a continuing student enrols for the whole year at once;
  the brief asks for a window per semester, so there is one.
- **The 24-unit limit is enforced on enrolment.** P&C states it as a rule for
  students. ISIS lets you request an overload; the app does not model that.
