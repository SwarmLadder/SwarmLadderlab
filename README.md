# SwarmLadder Lab

**Learn Together. Rise Together.** SwarmLadder's interactive developer education platform uses Next.js App Router, strict TypeScript, Tailwind, and Cloudflare Workers. The Python curriculum comes from [SwarmLadder/python-notebook](https://github.com/SwarmLadder/python-notebook).

## Development

Use Node 24 and Python 3.12. From this repository:

```sh
git clone https://github.com/SwarmLadder/python-notebook ../python-notebook
python -m pip install markdown pytest
npm ci
npm run curriculum
npm run dev
```

Open the URL printed by Vite. Use `python build/prepare.py --course /path/to/checkout` for another curriculum checkout. Regenerate assets after updating course content. Lesson, workbook, quiz, and project counts come from the course checkout. Unavailable tracks are labelled on the dashboard.

## Structure

- `src/app` defines dashboard, curriculum, achievement, progress and catch-all lesson routes. Links use clean paths such as `/lesson/basics/notebooks/00_python_introduction`.
- `src/features` owns learning views and browser progress. `src/components` contains the reusable editor and progress meter. The logo comes from the SwarmLadder GitHub organization.
- `src/styles/app.css` defines brand tokens, themes, breakpoints and focus styles.
- `build/` converts the course notebooks to rendered Markdown and code cells. It copies original helpers, assessment code and data into the generated public assets.
- `src/workers/runner.ts` manages one isolated Python session per notebook. `public/assets/py-worker.js` runs the existing Pyodide runtime and course checks. The first run needs network access to the Pyodide CDN. Workbook checks install pytest inside the browser.
- The GitHub achievement workflow remains in the course repository. Eligible learners download solution modules, create a claim in their fork, and submit a pull request for verification.

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
