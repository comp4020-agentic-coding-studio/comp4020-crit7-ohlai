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
