# AACOM planner

A degree planner and enrolment tool for one ANU degree, the Bachelor of Advanced
Computing (Honours). At ANU the rules for a degree live on Programs and Courses
and my enrolments live in ISIS. Nothing connects the two, so every semester I
have both open in tabs and check one against the other by hand. This app puts
them in one place. I lay out the whole degree semester by semester, the plan is
checked against the real AACOM rules, and when a semester's enrolment window
opens it can enrol me in what I planned.

It is single user with no login. The student is me, seeded with a made-up
student number and a history of courses up to Semester 2 2026.

## How to use it

- **Degree plan** is the home page. Each semester is a card. Add a course to any
  semester that hasn't started, or remove one. The box at the top lists what
  the plan is missing: degree rules not met, units short, a course placed
  before its prerequisites, a course in a semester it doesn't run in, more
  than 24 units in a semester.
- **Degree progress** is the panel on the right, or at the top on a phone. It
  shows units completed, enrolled and planned out of 192, and every required
  course as completed, enrolled or planned, or not yet covered.
- **Courses** searches the catalogue by code or title. From a result you can
  enrol in a course for a semester whose window is open, or add it to the plan.
- **Enrolment** shows each semester's window. Turn on "enrol me from my plan"
  and the planned courses are enrolled when the window opens. The log underneath
  says what it enrolled and why it skipped anything.

To see auto-enrol work today, use the dashed "Demo only" panel at the bottom of
the Enrolment page. It opens Semester 1 2027 now, or in a minute. "Put back"
restores the real date and removes what was enrolled. The panel is not part
of ISIS and says so.

## What good looks like here

Good means I can trust what the plan tells me. A planner that says "you're
fine" when a rule is missed is worse than having no planner. So the rules come
from Programs and Courses and not from memory. I read the AACOM program page,
the five specialisation pages and each course's page. The courses, units,
semesters and prerequisites in the app are copied from those pages, and every
source URL is on its course. Where I made the rules simpler, I wrote it down in
`notes/degree-source.md`. The main cuts are that the 12-unit transdisciplinary
rule is left out, only the Machine Learning specialisation is modelled, and
permission codes are ignored.

Two decisions shaped the rest.

**A plan is allowed to be wrong, and enrolment is not.** You can put COMP4610
in Semester 2 even though it only runs in Semester 1. The plan takes it and
flags it, because a draft that refuses input hides the reason. Enrolment
refuses the same move and says why, the way ISIS does. Manual enrolment and
auto-enrol use the same check, so they can't disagree.

**Auto-enrol has no timer.** The app sleeps when nobody is using it, so a
timer would never fire. Instead every request checks whether a window has
opened for a semester with auto-enrol on. If one has, that request does the
enrolling and marks the semester done in the same step. A second request finds
nothing to do, so a course can't be enrolled twice.

What I chose not to build: logins, more than one degree, the other four
specialisations, overload requests, waitlists, class timetables and fees.
Each is real, but none of them is the gap between the two tabs.

Tests in `spec/` enforce some of this. The plan contracts check that a course
added to a semester appears there and survives a reload. The plan check tests
cover each kind of "missing" against the real seed. The auto-enrol test opens a
window, sends eight requests at once, and checks each course was enrolled once.
Whether the rules are copied right, and whether this is actually quicker than
two tabs, is judgement. The first is why the source notes exist. The second is
for the crit.
