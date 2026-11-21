# Linux & Bash integration

Upstream source: https://github.com/SwarmLadder/linux-course

The Lab generates a course catalog from the upstream Markdown and the 12
Bash exercise starters. It publishes **36 lessons, 12 locally graded labs,
75 independent exercises, 60 interview Q&As and three projects**.

## Local builds

Clone the Linux source next to SwarmLadderlab, or set LINUX_COURSE.

    python build/prepare.py --course ../python-notebook --sql-course ../SQL \
      --git-course ../git-github-course --rust-course ../RUST --linux-course ../linux-course
    npm test
    npm run build
    npm run test:e2e

Source lessons are read-only Markdown. Each learner's Linux command notes and
progress stay in browser storage under unique linux/ prefixed activity IDs.

## Safety

The Linux playground is a **deliberately limited JavaScript simulator**:
a virtual folder, sample logs, and a small allowlist of inspection/teaching
commands. It cannot execute arbitrary Bash, sudo, SSH, binaries, or host
filesystem operations.

Full local Bash exercises require Linux/WSL2 and the upstream two-fixture
grader:

    git clone https://github.com/SwarmLadder/linux-course.git
    cd linux-course
    python tools/grade.py B01

Students can mark labs verified only after confirming they saw PASS locally.
The Lab stores the learner's confirmation; it is not server verification.
Starter code is imported; reference solution scripts are never shipped in
the activity catalog.

To update the course, modify the upstream lessons and rerun the builder;
do not hardcode extra catalog items in the React UI.

