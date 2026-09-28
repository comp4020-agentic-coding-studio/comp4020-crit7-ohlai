# Crit 7 reflection

## What was the breakthrough that moved the work forward?

Working out that my laptop not running the server didn't mean I had no test
loop. better-sqlite3 won't build on Windows ARM64, so going in I assumed
`pnpm check` was off the table and I'd be deploying and hoping. Installing with
`--ignore-scripts` got typecheck and build back, and pointing the spec tests at
the deployed app with `SPEC_BASE_URL` got the rest. After that every step was
deploy, run the whole suite against the real thing, then look at it. The
auto-enrol test that fires eight requests at once only exists because there was
somewhere to run it.

## What did this work change about who I want to be as a software developer?

The correction I care most about happened before any code. The agent wrote a
build prompt that told the session to cut features if time got tight, which
sounds responsible but means the agent decides what the app is. I'd rather make
that call myself, even if I get it wrong, because a quietly trimmed feature
never shows up as a failing test. It shows up as a smaller app.

The other thing was how much the tests didn't catch. Both real fixes this week,
the phone layout burying the plan and an Enrol button on a course I'd already
finished, came from looking at screenshots. Green tests told me the data was
right. They couldn't tell me the page was annoying to use, and that's kinda the
whole reason to replace ISIS in the first place. So I want to keep treating the
rendered page as the thing I'm checking, and the tests as what stops it
breaking again.
