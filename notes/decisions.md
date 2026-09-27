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
