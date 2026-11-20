# SwarmLadder Lab — Git & GitHub and Rust integration

## Status and source-of-truth

This integration imports curriculum directly from two canonical GitHub repositories:

- [SwarmLadder/git-github-course](https://github.com/SwarmLadder/git-github-course) — merged enrichment with **36 lessons, 24 graded offline Git tasks, 45 interview answers, six applied workshops and three portfolio projects**.
- [SwarmLadder/RUST](https://github.com/SwarmLadder/RUST) — merged Rust mastery enrichment with **36 workshops, 168 level coding functions (156 original and 12 new mastery), eight linked study-log lessons, nine projects and three mastery portfolio briefs**.

Changes to source content belong in those repositories. The Lab imports static activity metadata and guides on each build; it does not fork their native graders, tests or Rust compiler into a shared backend.

Existing Python and SQL implementations remain unchanged. SQL was already merged into the Lab before this integration.

## Available learning activities

| Course | Guided pages | Checked local tasks | Other reading/projects | Total pages |
|---|---:|---:|---:|---:|
| Git & GitHub | 36 lessons | 24 Git labs | 45 interview Q&As, six workshops, three projects | **114** |
| Rust | 39 guides (36 core workshops, three mastery guides) | 168 coding challenges + eight study-log steps | Nine original projects and three mastery portfolio briefs | **227** |
| **Combined** | **75** | **200** | **66** | **341** |

For Git, the source task checker uses native Git in independent disposable `.practice/` repositories; the Lab shows the source commands and task text. For Rust, 156 original functions and 12 mastery functions are imported individually from the original starter source, with the associated exercise guides. Rust tests run in local Cargo, not in the web browser.

The Lab's **200 checked tasks** count combines 24 Git lab checks and 176 Rust coding/study-log steps. All 200 are **learner-confirmed local passes**, not automated browser grades. Non-graded pages can be marked as read. The existing Python and SQL grading remains automatic as before.

## Browser execution and limits

**Python:** Pyodide executes and grades exercises in an isolated browser worker.

**SQL:** In-memory SQLite executes and grades queries inside the existing Pyodide worker, with source-derived fixtures and checks.

**Git & GitHub:** The site displays lesson content, a saved editable command-notes area, local start/check commands, source links, and progress. It does **not** execute actual Git commands. The official course grader runs locally with the installed Python/Git tools.

**Rust:** The site displays lessons and challenge starter functions, an editable saved source draft, local Cargo check commands, source links, and progress. The site does **not** compile Rust or execute native tests. The original Rust project compiles with Cargo and its tests. Adding a Rust runtime later requires a separate secure build/compute architecture with resource isolation and a dedicated runner.

For Git/Rust checked activities, the **Mark verified locally** button requires a checkbox affirming that the learner ran the indicated local checker and received a passing result. This is a self-reported state only, not a secure anti-cheat or grading signal. The button is not an authentication or credential check.

No SSH keys, local shell access, credentials, Docker, Rust compiler, subprocesses or production repositories are exposed to the browser. Browser drafts/progress stay in origin-local localStorage and can be exported/imported using the pre-existing progress format `swarmladderlab.v1`.

## Routes

- Shelf: `/learn`
- Git course: `/learn/git`
- Git first lesson: `/lesson/git/basics/lessons/00_git_model_and_setup`
- Git offline task: `/lesson/git/basics/labs/B01`
- Git interview example: `/lesson/git/basics/interview/01`
- Git workshop: `/lesson/git/advanced/workshops/06_release_and_ci_security`
- Rust course: `/learn/rust`
- Rust workshop: `/lesson/rust/basics/guides/workshop-1`
- Rust core function: `/lesson/rust/basics/core/temperature`
- Rust practice function: `/lesson/rust/basics/practice/integer_arithmetic/minutes`
- Rust mastery: `/lesson/rust/basics/mastery/B01`
- Rust project: `/lesson/rust/advanced/projects/settle`
- Rust portfolio: `/lesson/rust/advanced/portfolio/milestone-3`

Both courses use the shared shelf, route navigator, home resume, and progress dashboard. Git IDs use `git/` and Rust IDs use `rust/`, preserving Python and SQL saved states.

## Development setup

Use Node 24, Python 3.12 and the existing platform dependencies:

```sh
git clone https://github.com/SwarmLadder/python-notebook ../python-notebook
git clone https://github.com/SwarmLadder/SQL ../SQL
git clone https://github.com/SwarmLadder/git-github-course ../git-github-course
git clone https://github.com/SwarmLadder/RUST ../RUST

python -m pip install markdown pytest
npm ci
python build/prepare.py \
  --course ../python-notebook \
  --sql-course ../SQL \
  --git-course ../git-github-course \
  --rust-course ../RUST
npm run dev
```

Alternatively, on a clean checkout run `npm run build`. The `scripts/ensure-curriculum.mjs` helper fetches missing source repositories into `.generated/`. Optional explicit overrides are `COURSE`, `SQL_COURSE`, `GIT_COURSE` and `RUST_COURSE`, with matching `*_REPO` URL overrides for automatic downloads.

**Refresh after upstream changes:** generated catalog assets are cached locally. Delete or replace the generated assets (or use fresh CI checkout) and rerun preparation to get updated content. For reproducible release, pin all four source revisions through a controlled build workflow rather than silently taking moving branch heads.

## Generated layout

```text
public/data/
  catalog.json                   Python
  sql/catalog.json               SQL
  git/catalog.json               Git
  git/nb/git__...json             114 Git content pages
  rust/catalog.json              Rust
  rust/nb/rust__...json           227 Rust content pages
public/course/sql/              SQLite reference fixtures (unchanged)
```

Git/Rust do not add files to the Pyodide course-file manifest. Native student source code lives exclusively in the upstream repositories. The importer is `build/build_git_rust.py`.

## Tests and release gate

In an environment with all four source repositories:

```sh
python -m pytest tests -q
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

- Importer tests validate 114/227 page counts, exact starter signatures, course item IDs, local checking commands and absence of shipped reference implementations.
- Browser tests cover shelf links, catalog routes, Git lab acknowledgment, Rust draft persistence, native-course progress, guide and interview content.
- Existing Python and SQL browser suites continue to run on every PR.
- CI checks out all four curricula before preparing assets. Missing sources or incompatible schema fail the build.

**Before publishing:** review and merge the PR, deploy the built worker to staging, smoke-test Git B01, Rust B01, Git interview, Rust workshop, all-course progress export/import, then verify previous Python/SQL execution. Production deployment is **not** performed by the integration PR.

## Safety and maintenance notes

The imported text is trusted organizational Markdown and is rendered as HTML. Do not import arbitrary untrusted Markdown without a sanitization policy. Relative course links are rewritten to the appropriate canonical GitHub blobs. Avoid using native exercise content to claim automatic or centrally verified grades. Rust/Git projects may require context not contained in an isolated starter function; learners must edit the actual source repository files and run the official local test suite.

The purpose is to preserve high-quality authored material and an honest learning experience while keeping the current hosting architecture secure and simple.
