# Four-language Playground and highlighted Git/Rust lessons

This change fixes the plain-text Git/Rust lesson editor and Python-only Playground.
All four open courses now share the same CodeMirror editor design, with language-aware
syntax colors, line numbers, keyboard shortcuts and saved edits.

## Play modes

| Language | Editor | Run | Data and constraints |
|---|---|---|---|
| Python | CodeMirror Python | Real code in Pyodide web worker | Existing notebook packages and console |
| SQL | CodeMirror SQLite | Real SQL in Pyodide sqlite3 | Fresh fictional database each run; existing SQLite fixtures |
| Rust | CodeMirror Rust | **Official Rust Playground external compiler** | The source is sent to play.rust-lang.org **only on Run Rust**; must be a standalone Rust program, not an isolated course function |
| Git & GitHub | CodeMirror Bash/Git | **Browser Git practice simulator** | Simulated commits, branches, staging and status; not native Git; no filesystem/network access and no course grading |

The language selector lives on `/playground`. Each language has independent starter
examples, an editor filename and saved source keys: `scratch.py`, `scratch.sql`,
`scratch.rs`, and `scratch.sh`. Existing Python scratch code is kept at its original
localStorage key and is not deleted by changing language. The selected language is
saved as `swarmladderlab.playLanguage`.

Rust and Git lesson pages now use CodeMirror instead of an unhighlighted textarea.
Guided fenced Rust/Bash examples are colored with the Prism libraries already in the
platform. The **Try in Playground** button transfers the current draft to the proper
language's scratch file and navigates to the Playground. It does **not** count as a pass.

## Rust compilation

Click **Run Rust** to submit source code to the official Rust Playground's
public `POST https://play.rust-lang.org/execute` API, using stable Rust, debug mode,
2021 edition, binary crate and no test harness. The source is **not** automatically
uploaded during editing or page loading; no credentials are attached. A 32 KiB
source limit applies. The actual remote stdout, stderr and compile status are
shown in the Lab console, and compiler error line numbers are highlighted where
available. A link opens the same program on the official site if network access
or the public compiler is unavailable.

**Privacy:** Do not paste passwords, tokens, private code or proprietary content
into Rust snippets submitted to the public service. Compilation is performed by
a third party. The Lab does not promise sandbox guarantees beyond those of the
external service. The official Rust Playground can have availability or rate limits,
and only supports its own set of installed crates. The Lab does not host a Rust
compiler.

A standalone `fn main()` works in this mode. Course-specific starter functions
that reference the original repository's modules, types or tests still require
local Cargo verification; the browser Run Rust button is **not** a substitute
for the graded course tests.

## Git browser simulator

The browser Git mode is an isolated **teaching simulation**, implemented in
`src/lib/gitSandbox.ts`. It begins with an in-memory README and first commit,
then supports a small, safe set of commands:

```sh
git status
git log --oneline
git branch
git switch -c feature
write README.md "Practice history"      # simulator-only helper
git add README.md
git diff --cached
git commit -m "Practice"
git restore --staged README.md
git show
git init
```

The helper `write` is **not** a native Git command; it edits a fake file in this
educational sandbox. The simulator refuses shell pipelines, external commands,
network remotes, unknown Git subcommands and path traversal. It bounds input
length and commands per run, and uses deterministic toy commit IDs. Reset
reinitializes the simulated repository.

**Grading:** The 24 Git & GitHub course labs still require the real source course
checker and an actual local Git installation to verify their intended state. A
simulated commit is not a graded Git pass. Always use
`python tools/practice.py start <ID>` and `python tools/practice.py check <ID>`
inside a cloned course repository for true completion evidence.

## Verification

Run with Node 24 and all four source curricula available:

```sh
npm test
npm run build
npm run test:e2e
```

Unit tests cover simulated Git staging, commit history, branch switching,
restore, invalid commands and reset. Playwright browser tests cover syntax
tokens on native lessons, draft handoff to the Playground, independent language
source persistence, SQL execution, simulated Git commands, successful/error
remote Rust compiler responses (mocked to be deterministic), and mobile layout.
Existing Python/SQL suites remain mandatory.

## Future work

For genuinely native, auto-graded Git course exercises in the browser, consider
a full embedded Git engine with a disposable virtual filesystem and task
checker parity. For privately executed Rust, consider dedicated isolated
server-side compilation with explicit per-user limits, cost controls, and
abuse prevention. Do not claim those capabilities exist today.
