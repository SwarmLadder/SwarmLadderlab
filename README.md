# SwarmLadder Lab

**Learn Together. Rise Together.** SwarmLadder's interactive developer education platform uses Next.js App Router (via vinext), strict TypeScript and Cloudflare Workers. The Python curriculum comes from [SwarmLadder/python-notebook](https://github.com/SwarmLadder/python-notebook).

## Development

Use Node 24 and Python 3.12. From this repository:

```sh
git clone https://github.com/SwarmLadder/python-notebook ../python-notebook
python -m pip install markdown pytest
npm ci
npm run curriculum
npm run dev
```

Every build (the Vite config runs `scripts/ensure-curriculum.mjs`) prepares the curriculum automatically when `public/data` is missing: it uses `$COURSE` or `../python-notebook`, or clones the course into `.generated/`. This lets hosted builders such as Cloudflare Workers Builds build from this repository alone.

Open the URL printed by Vite. Use `python build/prepare.py --course /path/to/checkout` for another curriculum checkout. Regenerate assets after updating course content. Lesson, workbook, quiz, and project counts come from the course checkout. Courses that aren't open yet appear on the shelf as "In preparation".

## Structure

- `src/app` defines the routes: home (`/`), the course shelf (`/learn`), a course route (`/learn/python`), lessons (`/lesson/basics/notebooks/00_python_introduction`), playground, achievements and progress. `/curriculum` redirects to `/learn/python`.
- `src/features` owns the views. `home` greets new visitors and gives returning learners a desk that picks up where they stopped. `course` draws the route: finished rungs fold away, the current rung and the next few show, and later chapters stay closed until opened. `notebook` turns each notebook into steps (`steps.ts`) revealed one at a time, with runnable code, quiz cards and a completion card.
- `src/lib/journey.ts` orders a course into a route and finds the learner's current rung. `src/lib/courses.ts` lists the courses on the shelf.
- `src/i18n` holds every interface string. Add a locale by adding a strings file and an entry in `src/i18n/index.ts`, including its text direction.
- `src/styles/field.css` is the design system: colour tokens for day and night reading, the type scale (Fraunces, Instrument Sans, JetBrains Mono, all self-hosted) and the page layouts. `src/styles/lesson.css` styles lessons, code, quizzes and the playground.
- `build/` converts the course notebooks to rendered Markdown and code cells. It copies original helpers, assessment code and data into the generated public assets.
- `src/workers/runner.ts` manages one isolated Python session per notebook. `public/assets/py-worker.js` runs the existing Pyodide runtime and course checks. The first run needs network access to the Pyodide CDN. Workbook checks install pytest inside the browser.
- The GitHub achievement workflow remains in the course repository. Eligible learners download solution modules, create a claim in their fork, and submit a pull request for verification.

### Adding a course

Add an entry to `src/lib/courses.ts` with `status: "soon"` to show it on the shelf. When its content is ready, prepare its data the way `build/prepare.py` does for Python and switch it to `"open"`. Its route is `/learn/<id>`.

## Verify and deploy

```sh
python -m pytest tests -q
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

The Learning platform workflow verifies pull requests, main and scheduled course imports. To publish staging from GitHub, supply the repository secret `CLOUDFLARE_API_TOKEN` and variables `CLOUDFLARE_ACCOUNT_ID` and `STAGING_URL`, then run the workflow with **Deploy and verify the staging Worker** checked.

After staging passes and the migration is reviewed, run `npm run deploy:release` at the verified revision with the same course checkout. It builds the separate `swarmladder-lab` Worker. Run the browser suite with the production URL before retiring the previous origin. A future custom domain can be attached to the production Worker in Cloudflare.

## Move existing progress

Before the legacy origin is retired, open the original dashboard in the browser profile used to study and export progress. Open **Progress** on the new site, back up any existing local work, and import that JSON. Import replaces the destination snapshot. Saved edits, timestamps and last lesson retain their v1 identifiers. Browser storage is origin-specific. Theme and GitHub username are separate preferences and can be selected again on the new site.

## License

[MIT](LICENSE) for platform code. Course content is CC BY 4.0.
