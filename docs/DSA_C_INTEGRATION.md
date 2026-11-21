# DSA and C course integration

These are **two separate learning paths** inside the existing SwarmLadder Lab. The source repositories stay independent and remain the source of truth.

## Course inventory

- /learn/dsa: 36 rigorous lessons, 48 original Python problems, three projects, three mock interviews and four additional mastery resources (94 activities). Example: /lesson/dsa/basics/problems/B01.
- /learn/c: 18 workshops, 18 deep dives, 12 native mastery labs, 12 project briefs, 36 interviews and five engineering resources (101 activities). Example: /lesson/c/basics/labs/01-checked_add.
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

## DSA Python execution

An existing Pyodide Web Worker executes Python in the browser. The DSA importer publishes the six test cases already in the upstream problem bank; it does not create hidden tests. The harness deep-copies each case's arguments, calls the learner's solve function, compares strict JSON-compatible results and reports failing inputs/expected values. A problem is marked complete only when all six public cases pass. Code and progress are stored on this browser's origin.

Students should still derive the algorithm, assess time and memory use, and solve independent variations from the upstream course. Six passing published cases are **not proof of correctness on all inputs or algorithmic efficiency**. A stop/restart control and timeout help recover a hung Python worker; browser execution depends on loading Pyodide from the CDN.

## C local verification

C lessons render original teaching material and allow draft editing where source examples exist. Lab starters are imported from mastery/starter, not the upstream reference implementations. The C lesson page never executes native C or claims to run a compiler. Instead, clone https://github.com/SwarmLadder/C and run the named local command, for example:

    make mastery-check TASK=checked_add

A learner checks a confirmation box after seeing PASS locally; the recorded mark is an **attestation**, not an online-verified grade. Use the upstream Makefile for comprehensive native tests, sanitizer builds and capstone practice.

## Publishing

The existing workflow validates PRs; a verified commit on main may deploy staging if the Cloudflare repository secret and account variable are configured. Existing progress stays in localStorage and does not sync between origins automatically. Use the Progress export/import capability before switching origins.
