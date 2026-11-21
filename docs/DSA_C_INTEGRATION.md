# DSA and C course integration

These are **two separate learning paths** inside the existing SwarmLadder Lab. The source repositories stay independent and remain the source of truth.

## Course inventory

- /learn/dsa: **practice-first** with 48 runnable Python problems, followed by 36 deep lessons, three projects, three mock interviews and four mastery resources (94 activities). First challenge: /lesson/dsa/basics/problems/B01. Two quick examples help learners iterate; completing all six public cases records graded progress.
- /learn/c: **practice-first** with 81 real native-tested C function drills and 12 mastery labs, followed by 18 workshops, 18 deep dives, 12 project briefs, 36 interviews and five resources (**182 activities / 93 self-reported local checks**). First task: /lesson/c/basics/drills/whole_minutes.
- All activity IDs use dsa/ or c/ prefixes. Existing Python/SQL/Git/Rust/Linux IDs and progress remain unchanged.

## Reproduce the build

Use Node 24 and Python 3.12. Check out all seven source repositories next to SwarmLadderlab, or provide their paths explicitly. The new flags are --dsa-course and --c-course.

    python build/prepare.py --course ../python-notebook --sql-course ../SQL \
      --git-course ../git-github-course --rust-course ../RUST \
      --linux-course ../linux-course \
      --dsa-course ../Data-Structures-Algorithms --c-course ../C
    DSA_COURSE=../Data-Structures-Algorithms C_COURSE=../C python -m pytest tests/test_dsa_c_build.py -q
    npm test
    npm run build
    npm run test:e2e

The CI checks out all upstream sources, tests the generated catalog and JSON pages, runs source-agnostic JavaScript harness tests, and executes browser route/regression tests.

## How this mirrors the existing Python notebooks

The Python course has executable per-cell challenges, a code editor, visible checks, error feedback, and progress awarded after passing tests. DSA now opens directly on its first Python problem: **read the short task, edit, try two examples, run six public checks, review failures, and only open the detailed explanation when needed**. Its long lessons still exist but do not obstruct the coding path.

C uses the same *task-first* learning structure but a different truthful verification model. Every one of the 81 upstream C function tests is now an independent activity. A function contract and editor are followed by the exact local Make command and the real published C test, then optional theory. C drafts persist per starter filename, not per activity, so completing one function doesn't discard edits when moving to the next function in the same source file. A local compiler remains necessary; claiming browser autograding for C would be inaccurate.

## DSA Python execution

An existing Pyodide Web Worker executes Python in the browser. The DSA importer publishes the six test cases already in the upstream problem bank; it does not create hidden tests. The harness deep-copies each case's arguments, calls the learner's solve function, compares strict JSON-compatible results and reports failing inputs/expected values. A problem is marked complete only when all six public cases pass. Code and progress are stored on this browser's origin.

Students should still derive the algorithm, assess time and memory use, and solve independent variations from the upstream course. Six passing published cases are **not proof of correctness on all inputs or algorithmic efficiency**. A stop/restart control and timeout help recover a hung Python worker; browser execution depends on loading Pyodide from the CDN.

## C local verification

C lessons render original teaching material and allow draft editing where source examples exist. Lab starters are imported from mastery/starter, not the upstream reference implementations. The C lesson page never executes native C or claims to run a compiler. Instead, clone https://github.com/SwarmLadder/C and run the named local command, for example:

    make mastery-check TASK=checked_add

A learner checks a confirmation box after seeing PASS locally; the recorded mark is an **attestation**, not an online-verified grade. Use the upstream Makefile for comprehensive native tests, sanitizer builds and capstone practice.

## Publishing

The existing workflow validates PRs; a verified commit on main may deploy staging if the Cloudflare repository secret and account variable are configured. Existing progress stays in localStorage and does not sync between origins automatically. Use the Progress export/import capability before switching origins.
