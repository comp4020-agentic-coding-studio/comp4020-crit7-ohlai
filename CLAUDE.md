# CLAUDE.md

Project rules for this repository. Read this before writing or changing any
code.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/07-anu-system/)
publishes this deliverable's brief and spec (crit 7, build the ANU system you
wish existed). The deployed app at https://comp4020-crit7-ohlai.fly.dev is what
gets marked, not this repo, and `PROCESS.md` is read against the commit history
behind it. The cutoff is Monday 28 September, 12:00.

## What this is

A replacement for ANU enrolment (ISIS) joined to Programs and Courses, for one
degree: the **Bachelor of Advanced Computing (Honours)**, AACOM. Today those are
two systems. Programs and Courses holds the rules and ISIS holds the
enrolments, and checking one against the other is my job. Here they are one app.

The slice, in order of importance:

1. **The degree plan.** I lay out my degree semester by semester and choose
   the courses for each. The plan is checked against AACOM's requirements and
   says what is missing: a required course not in the plan, a unit count
   short, a prerequisite placed after the course that needs it.
2. **Degree progress**, a panel that is always visible: required courses
   completed, planned, and not yet covered.
3. **Manual enrolment.** Search courses by code or title and enrol in one for
   a semester.
4. **Auto-enrol.** Per semester, "enrol me from my plan". When that
   semester's enrolment window opens, the planned courses are enrolled.

Single user, no login: one hardcoded student record.

### Rules for this slice

- **The degree data is grounded, not invented.** Requirements, courses, units,
  offerings and prerequisites come from programsandcourses.anu.edu.au (2026
  handbook). Every source URL and every simplification is recorded in
  `notes/degree-source.md`. A rule that is not on a P&C page does not go in
  the seed. If a simplification changes, that file changes in the same commit.
- **No background timers.** The machine stops when idle, so `setInterval` and
  cron never fire. Each semester's `enrolment_opens_at` lives in the
  database, and any window that has opened is processed on the next request.
  Processing is idempotent: it never enrols the same course twice.
- **The demo control is labelled as a demo.** It opens a window now (or in a
  minute) so auto-enrol can be shown live. It must never pass for a real
  ISIS feature.
- **Server-rendered pages and forms that POST.** Client JavaScript only where
  it earns its place, such as live search, and the page works without it.

## Hard constraints

These are the published spec, restated as things to hold. If a change would
break one, stop and say so instead of working around it.

- The app loads at its `*.fly.dev` URL by the cutoff.
- It models a slice of a real ANU system, wired end to end. Not a mockup with
  hardcoded data behind it.
- The core flow persists across a reload. Create something, reload, it is still
  there.
- `PROCESS.md` gives the process overview, and the week's reflection goes in
  `reflections/crit-7.md`. That exact filename, or `pnpm check:evidence` fails.
- `pnpm check` passes before any commit.
- The repo stays private until the cutoff.

## Working style

- One commit per unit of work. Never squash, never amend. Conventional commit
  messages: `docs:`, `test:`, `feat:`, `fix:`, `chore:`.
- After every commit, append to `notes/decisions.md`: the hash, what you did,
  what the obvious alternative was, why you went the other way, and how you
  checked the result was right. One short paragraph. The entry for a commit
  lands in the commit after it, because it needs that hash.
- **Never weaken a check to make it pass.** A red check is information about the
  app, not an obstacle in front of it. If a check is wrong, say so and change it
  on purpose, in its own commit, with the reasoning in `notes/decisions.md`.
- **Never commit a regression.** Anything green stays green. The exception is my
  own `spec/` tests for this week, which are this brief turned into contracts
  and are red on purpose until the app is built. Red to green across those is
  the work, and the commits that turn each one green are the process evidence
  `PROCESS.md` cites.
- When a check fails, read its output before you change anything.
- When a failure has a root cause, fix the cause and add a check for it. Do not
  patch the symptom and move on.
- When an approach is abandoned, say so in the commit message rather than
  quietly deleting it.
- If a requested change conflicts with anything in this file, stop and raise it
  before making the change.
- **What the agent writes is a draft, not a delivery.** An agent will produce
  plausible screens and plausible copy all day. Making them hang together, and
  sound like one person with a position, is my job.
- **Open the app in a browser and look at it**, at both marking viewports. The
  rendered page is the truth. Your mental model of it is not.
- **Read it as a stranger would.** A test can confirm a record persists across a
  reload. Only using the thing tells you whether the slice is the one that
  actually annoys people, and whether the flow through it is shorter than the
  system it replaces. That judgement is most of the mark and nothing in `check`
  touches it.
- The `unslop` skill applies to every word a user reads, and to this file.

## The checks

`pnpm check` runs type checking, the production build and the `spec/` tests.
`pnpm check:evidence` is the extra gate before shipping. CI runs the same plus
the secret scan and the deploy, and the CI jobs are gated on the repo being
public, so local `pnpm check` is the only feedback loop until the cutoff.

`spec/README.md` says what each supplied check holds and which ones retire with
the starter. Read it before adding tests. The short version: `invariants` and
`readme` stay, `guestbook` goes when the starter plumbing does, and the week's
spec tests are mine to write.

The invariants run against the **running** app, booted from
`dist/server/entry.mjs` with a throwaway database, so `astro build` has to
succeed before any of them mean anything.

### Facts about this stack that are easy to get wrong

- **`better-sqlite3` has no prebuilt binary for Windows ARM64**, which is this
  machine. It compiles from source through node-gyp and needs the MSVC C++
  ARM64 toolchain from Visual Studio Build Tools. Without it `pnpm install`
  fails at `better-sqlite3 install` with `Could not find any Visual Studio
  installation to use`, and nothing else in the repo is at fault. Fly builds
  the image remotely on Linux, so a deploy works whether or not the local build
  does.
- **`spec/routes.ts` is the list of pages the invariants visit.** A
  server-rendered app has no `dist/*.html` files to walk, so nothing discovers
  new pages for you. Add a page, add its route, or the invariants silently stop
  covering it.
- **The axe pass runs in jsdom, with no browser.** Colour contrast and element
  overlap rules are off. It is a floor, not an accessibility pass. Looking at
  the page is still the check for those.
- **`fly.toml` has no `app` line on purpose.** The app name is passed on the
  command line, so every deploy is
  `flyctl deploy --remote-only --ha=false -a comp4020-crit7-ohlai`. A deploy
  without `-a` fails.
- **The token lives in `mise.local.toml`, which is gitignored.** If `flyctl`
  says it has no access token, mise is not active in that shell. Run it as
  `mise exec -- flyctl ...`.
- **`DATABASE_PATH` decides where the state lives.** `fly.toml` points it at
  `/data` on the machine's volume, which is why state survives a reload and a
  redeploy. Locally it falls back to `./.data/app.db`, which is gitignored.
- **Migrations run at boot**, from `src/lib/db.ts`, on whatever machine holds
  the volume. The flow is: edit `src/lib/schema.ts`, run `pnpm db:generate`,
  then commit the migration it writes into `drizzle/`. A schema change with no
  committed migration works locally and breaks the deploy.
- **There is no base path this week.** The static weeks served under
  `/<repo-name>/` and punished root-absolute links. This is a Fly app at the
  root of its own domain, so `href="/bookings/"` is correct here. Do not carry
  the base-path workarounds forward.

## This file is yours

A starting point, not a rulebook. What I add to it is the harness, and the
harness is assessed. As I learn what this app needs, a convention the work has
to hold to, a check that keeps catching me out, a fact about the stack that is
easy to get wrong, it gets written down here and wired into `check`. Growing
this file is the work.

This file and the sensors wired into `check` carry across the course. Both come
with me into the next repo. The app does not. The code, and the tests answering
this brief, stay behind. `spec/README.md` draws the line.
