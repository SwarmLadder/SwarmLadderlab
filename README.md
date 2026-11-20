# SwarmLadder Lab

**Learn Together. Rise Together.** SwarmLadder's interactive developer education platform uses Next.js App Router (via vinext), strict TypeScript and Cloudflare Workers. The four open courses import their content from [Python](https://github.com/SwarmLadder/python-notebook), [SQL](https://github.com/SwarmLadder/SQL), [Git & GitHub](https://github.com/SwarmLadder/git-github-course) and [Rust](https://github.com/SwarmLadder/RUST).

## Development

Use Node 24 and Python 3.12. From this repository:

```sh
git clone https://github.com/SwarmLadder/python-notebook ../python-notebook
git clone https://github.com/SwarmLadder/SQL ../SQL
git clone https://github.com/SwarmLadder/git-github-course ../git-github-course
git clone https://github.com/SwarmLadder/RUST ../RUST
python -m pip install markdown pytest
npm ci
npm run curriculum
npm run dev
```

Every build (through `scripts/ensure-curriculum.mjs`) prepares all four curricula when generated assets are missing. It uses `COURSE`, `SQL_COURSE`, `GIT_COURSE` and `RUST_COURSE` or their sibling checkout defaults, cloning missing sources into `.generated/`. This lets hosted builders such as Cloudflare Workers Builds build from this repository alone.

Open the URL printed by Vite. Use `python build/prepare.py --course /path/to/python --sql-course /path/to/SQL --git-course /path/to/git --rust-course /path/to/rust` for other curriculum checkouts. Regenerate assets after updating course content. Lesson, workbook, quiz, and project counts come from the course checkout. Courses that aren't open yet appear on the shelf as "In preparation".

## Structure

- `src/app` defines the routes: home (`/`), the course shelf (`/learn`), a course route (`/learn/python`), lessons (`/lesson/basics/notebooks/00_python_introduction`), playground, achievements and progress. `/curriculum` redirects to `/learn/python`.
- `src/features` owns the views. `home` greets new visitors and gives returning learners a desk that picks up where they stopped. `course` draws the route: finished rungs fold away, the current rung and the next few show, and later chapters stay closed until opened. `notebook` turns each notebook into steps (`steps.ts`) revealed one at a time, with runnable code, quiz cards and a completion card.
- `src/lib/journey.ts` orders a course into a route and finds the learner's current rung. `src/lib/courses.ts` lists the courses on the shelf. `src/features/sql/SqlLesson.tsx` provides SQLite execution and checking; `src/features/native/NativeLesson.tsx` provides Git and Rust course content, saved code drafts and explicit local checker instructions.
- `src/i18n` holds every interface string. Add a locale by adding a strings file and an entry in `src/i18n/index.ts`, including its text direction.
- `src/styles/field.css` is the design system: colour tokens for day and night reading, the type scale (Fraunces, Instrument Sans, JetBrains Mono, all self-hosted) and the page layouts. `src/styles/lesson.css` styles lessons, code, quizzes and the playground.
- `build/` converts Python, SQL, Git and Rust source lessons, exercises, interview material and projects into browser-readable course catalogs. It copies original helpers, assessment code and data into the generated public assets.
- `src/workers/runner.ts` manages one isolated Python session per notebook. `public/assets/py-worker.js` runs the existing Pyodide runtime and course checks. The first run needs network access to the Pyodide CDN. Workbook checks install pytest inside the browser.
- The GitHub achievement workflow remains in the course repository. Eligible learners download solution modules, create a claim in their fork, and submit a pull request for verification.

### Complete SQL course

SQL is now an open course at `/learn/sql`. It imports **105 learning activities** from SwarmLadder/SQL: 30 guided lessons, 48 graded query challenges, four graded schema design labs, six projects, eight backend SQL recipes and nine optional PostgreSQL references. SQLite executes in the existing browser worker, with fresh in-memory datasets and two-fixture challenge checks; PostgreSQL content is clearly marked as not runnable in SQLite. See [SQL integration and release guide](docs/SQL_INTEGRATION.md) for architecture, safety, verification and deployment details.

### Complete Git & GitHub and Rust courses

Git & GitHub is open at `/learn/git` with **114 activities**: 36 lessons, 24 locally graded Git labs, 45 interview Q&As, six workshops and three portfolio projects. Rust is open at `/learn/rust` with **227 activities**: 39 guides, 168 coding functions, eight study-log lessons, nine projects and three mastery portfolio briefs. Both have saved drafts and independent progress tracking. **Git commands and Cargo tests run on the learner's own machine, not inside the browser.** Learners must report a local pass explicitly; those marks are not automated online grades. For exact routes, content counts, safety and release checks see [Git/Rust integration guide](docs/GIT_RUST_INTEGRATION.md).

### Adding a course

Add an entry to `src/lib/courses.ts` with `status: "soon"` to show it on the shelf. When its content is ready, prepare its data the way `build/prepare.py` does for Python and switch it to `"open"`. Its route is `/learn/<id>`.

## Verify and deploy

```sh
COURSE=../python-notebook SQL_COURSE=../SQL GIT_COURSE=../git-github-course RUST_COURSE=../RUST python -m pytest tests -q
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The production build uses vinext and Cloudflare's Vite plugin. The Worker serves App Router requests and Cloudflare Static Assets serves bundles, notebooks and course files. No database or user account is required.

Authenticate locally with `npx cf auth login`, or configure a scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in CI. Build, upload staging and test its public URL:

```sh
npm run build
npm run deploy:staging
BASE_URL=https://swarmladder-lab-staging.YOUR-SUBDOMAIN.workers.dev npm run test:e2e
```

The Learning platform workflow verifies pull requests, main and scheduled imports of **all four** source curricula. To publish staging from GitHub, supply the repository secret `CLOUDFLARE_API_TOKEN` and variables `CLOUDFLARE_ACCOUNT_ID` and `STAGING_URL`, then run the workflow with **Deploy and verify the staging Worker** checked.

After staging passes and the migration is reviewed, run `npm run deploy:release` at the verified revision with the same course checkout. It builds the separate `swarmladder-lab` Worker. Run the browser suite with the production URL before retiring the previous origin. A future custom domain can be attached to the production Worker in Cloudflare.

## Move existing progress

Before the legacy origin is retired, open the original dashboard in the browser profile used to study and export progress. Open **Progress** on the new site, back up any existing local work, and import that JSON. Import replaces the destination snapshot. Saved edits, timestamps and last lesson retain their v1 identifiers. Browser storage is origin-specific. Theme and GitHub username are separate preferences and can be selected again on the new site.

## License

[MIT](LICENSE) for platform code. Course content is CC BY 4.0.
