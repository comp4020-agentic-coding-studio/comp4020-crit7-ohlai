# Process overview

## What I built

A planner for the Bachelor of Advanced Computing (Honours) that joins Programs
and Courses to ISIS. It has a degree plan checked against the real rules, a
progress panel, course search with enrolment, and auto-enrol from the plan when
a window opens. `README.md` has the detail.

## How I got here

The first correction came before any code. I had Claude draft the prompt for
the build session, and the draft told that session to cut features if time ran
short. I pushed back:

> i will descide if a feature and scoope compete. Do not second guess me if
> you dont think there is enough time

The final prompt keeps the cutoff as a fact and leaves scope to me. An agent
quietly trimming features would never fail a test. It would just ship a
smaller app.

The starter went live first. Then the system went into `CLAUDE.md`
([`b8d7c8f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-ohlai/commit/b8d7c8f))
and the plan contracts went in red
([`8b90c29`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-ohlai/commit/8b90c29)).
The rules, 42 courses and their prerequisites are copied from the 2026
Programs and Courses pages, with every simplification listed in
`notes/degree-source.md`
([`33f9dae`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-ohlai/commit/33f9dae)).
Running the check on the seed caught a double-counting bug before that commit.

This machine can't boot the server, so `pnpm check` never ran here. Two
workarounds kept a loop going. Installing with `--ignore-scripts` gave me
typecheck and build, and `SPEC_BASE_URL` points `spec/` at the deploy
([`1a863d8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-ohlai/commit/1a863d8)).
The auto-enrol test sends eight requests at once and checks no course is
enrolled twice
([`bd16e15`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-ohlai/commit/bd16e15)).

Looking at the pages caught what the tests missed. On a phone the progress
panel buried the plan
([`1faf1d5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-ohlai/commit/1faf1d5)),
and a course I had already completed still offered "Enrol"
([`9160115`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-ohlai/commit/9160115)).
