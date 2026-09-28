# Decisions

One entry per commit, appended after the fact: the hash, what I did, what the
obvious alternative was, why I went the other way, and how I checked the result
was right. The entry for a commit lands in the commit after it, because it needs
that hash.

## b678ed8 harness: carry forward from assignment 2

Merged the assignment 2 CLAUDE.md into the crit 7 starter's rather than
copying either one over the other. The obvious alternative was to take all 243
lines of the assignment 2 file and prune later, which loses less, but two
thirds of that file was SLOP2034 course content and Astro theme and collection
facts that have no referent in a Fly app with no theme, and a rule with no
referent is noise that makes the real rules harder to find. Checked by diffing
the two files section by section before writing, and by confirming against the
starter that the facts I kept still apply: spec/routes.ts, the jsdom axe pass,
the missing `app` line in fly.toml, and migrations running at boot are all in
the files they describe. The base path rule went in inverted on purpose, since
the static weeks trained the opposite habit.

## f72f6d2 test: crit 7's spec, as far as a machine can hold it

Wrote the live fly.dev check and left the wiring and persistence contracts as
`it.todo`. The obvious alternative was to guess a flow and write those two
tests against it, but the flow they assert is the flow through a slice that
was not chosen yet, and a guessed contract would have to be rewritten or,
worse, quietly bent to fit. Checked by reading the spec file against the five
published lines: three are machine-checkable and two are named at the bottom
as the crit's to judge. Not run, because better-sqlite3 cannot build here.

## b8d7c8f docs: choose the system, ISIS enrolment joined to Programs and Courses

Wrote the system, the slice and the slice's own rules into CLAUDE.md, after
deploying the untouched starter so the live URL check could go green first.
The obvious alternative was to write only the one-line choice and let the
rules emerge in code, but the no-timer rule for auto-enrol and the grounding
rule for degree data are exactly the kind an agent breaks by reflex (a
`setInterval` is the first thing it reaches for), so they are cheaper to state
up front. Checked the deploy with a curl of the live URL, which returned 200.

## 8b90c29 test: the plan contracts, a course added to a semester renders and persists

Filled in the two `it.todo` tests with a contract stated at the top of the
file: `data-term` and `data-course` hooks on the plan page, and form POSTs to
`/api/plan` and `/api/plan/remove`. The obvious alternative was to match on
visible text like "COMP4610", which would pass if the course showed up
anywhere on the page, including the progress panel or the search box, so it
would not prove the course landed in the right semester. The hooks tie the
assertion to the semester without saying how the page is built. The courses
used run in the semester they are placed in, so the tests do not depend on
whether the planner accepts impossible entries. Not run: the suite needs the
built server, which needs better-sqlite3.

## 33f9dae feat: schema, migration and seed for the AACOM planner

Modelled the degree rules as ordered JSON rules in a `requirements` table,
where a rule that names courses claims them. The obvious alternative was a
flat list of required course codes plus a unit total, which is how most
planners fake it, but AACOM's rules are not flat: three "one of" pairs, a
specialisation with a 4000-level minimum inside it, a capstone with three
alternative routes, and an elective pool that must not double count courses
already used. A flat list would have meant inventing a simpler degree, and
the brief says not to invent rules. Checked by running the check on the
seeded plan in a scratch vitest run and reading every line of its output
against the P&C page. That run caught a bug: a half-done capstone option
kept its claims, so COMP4500 counted as its own "further 4000-level" course.
Fixed before the commit. Deployed, and the boot logs show migration 0001
and the seed ran.

## 1643549 feat: the degree plan page, with the missing-requirements check and progress panel

Let the plan accept any real course in any future semester and flag what is
wrong, instead of refusing bad entries. The obvious alternative was to
validate on add (reject COMP4610 in Semester 2), which is what ISIS does for
enrolment, but a plan is a draft, and a refusal hides the reason where a flag
shows it next to the course. Enrolment, in the next step, is where refusal
belongs. Checked by deploying and running spec/ against the live app through a
scratch global setup that points `baseUrl` at fly.dev: 27 of 27 passed,
including both plan contracts, the invariants and the README check. The
persistence test's leftover entry was removed afterwards. Then screenshots at
both viewports, which showed the phone problem fixed in the next commit.

## 1faf1d5 fix: on a phone, start the required-courses list closed

Closed the required-courses list by default below 60rem with a three-line
script. The obvious alternative was to move the progress panel below the
plan on a phone, which fixes the scroll but breaks the brief's "always
visible", since on a phone it would sit a dozen screens down. Keeping the
bar and totals at the top and folding only the long list keeps it in view.
With no JavaScript the list stays open, so nothing becomes unreachable.
Found by looking at the phone screenshot, which no test would have caught.

## ed71932 feat: course search and manual enrolment

Made enrolment refuse with a reason, the way ISIS does, and put the check in
one function that auto-enrol will share. The obvious alternative was to let
manual enrolment through and flag problems like the plan does, but an
enrolment is a commitment, not a draft, and two separate checks for manual
and auto-enrol would drift apart. Prerequisites count completed and enrolled
courses only, not planned ones, because ISIS knows nothing about a plan.
Checked on the deploy by POSTing an enrolment for Semester 1 2027 before its
window: it redirected with "Enrolment for Semester 1 2027 opens 30 Nov 2026,
9:00 am."

## bd16e15 feat: auto-enrol from the plan, processed on request, with a demo control

Processed auto-enrol in middleware on every request, guarded by a processed
stamp set in the same transaction plus the unique index. The obvious
alternative was a `setInterval`, which the brief rules out because the
machine stops when idle, or processing only on the enrolment page, which
would mean a window opening while I sat on the plan page did nothing until
I clicked across. Every request is the honest version of "when the window
opens". The cost is one small indexed query per request. Checked with eight
parallel requests in spec/auto-enrol.test.ts against the live app, and by
running the demo for real on prod and reading the log.

## 9160115 fix: no Enrol button on a course already taken, and the log in time order

Hid the enrol and plan actions on courses already taken, instead of leaving
them and letting enrolment refuse. The obvious alternative was to keep the
buttons, since the refusal message is accurate, but a button that can only
fail is noise on a page whose job is to make the next action obvious. Found
by reading the step 7 screenshot as a stranger would, not by a test.
Deployed, then checked that prod was back to its seeded state after the
live test runs and the demo run.

## 1a863d8 chore: live spec runs, harness facts, and the reflection skeleton

Taught `spec/global-setup.ts` to take `SPEC_BASE_URL` and skip booting the
server. The obvious alternative was to keep the scratch vitest config I had
been using outside the repo, but then the only way `spec/` ever ran on this
machine would be a trick nobody could see or repeat. The cost is that a live
run writes to the real database, so the persistence test now cleans up after
itself and CLAUDE.md says any new flow test must too. Checked with the real
vitest config against fly.dev (64 of 64), then read prod back: the seeded
plan with nothing enrolled for 2027 and auto-enrol off.

## dbfbea3 docs: the README, served at /readme/ as the About page

Wrote the README around one claim, that good means the plan can be trusted,
and hung the two main decisions and the list of what was left out on it. The
obvious alternative was a feature tour, but the template asks what good looks
like and what was chosen not to build, and a tour answers neither. Checked
with the README spec test against the deploy, which timed out once on a cold
start and passed on the rerun, and by reading the rendered page in a
screenshot.
