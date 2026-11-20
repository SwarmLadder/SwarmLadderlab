# SwarmLadder Lab — SQL course integration

## Scope and source of truth

The source curriculum is [SwarmLadder/SQL](https://github.com/SwarmLadder/SQL), not a second copy inside the Lab. The Lab imports all **105 activities**:

| Level | Guided lessons | Graded query challenges | Schema-design checks | Projects | Backend recipes | PostgreSQL references |
|---|---:|---:|---:|---:|---:|---:|
| Basics | 10 | 16 | 0 | 2 | 0 | 0 |
| Intermediate | 10 | 16 | 0 | 2 | 0 | 0 |
| Advanced | 10 | 16 | 4 | 2 | 8 | 9 |
| **Total** | **30** | **48** | **4** | **6** | **8** | **9** |

The four schema exercises use the original behavioral checker, not snapshot equality.
Additional reading (interview roadmap, mock interviews, database design scenarios)
remains available in the SQL repository.

## Local setup

Use Node 24 and Python 3.12. From the Lab checkout:

    git clone https://github.com/SwarmLadder/python-notebook ../python-notebook
    git clone https://github.com/SwarmLadder/SQL ../SQL
    python -m pip install markdown pytest
    npm ci
    python build/prepare.py --course ../python-notebook --sql-course ../SQL
    npm run dev

Alternatively, run the build without manual course clones. The
scripts/ensure-curriculum.mjs tool clones both curricula into .generated/
when their local paths or explicit environment variables are absent.
Set COURSE and SQL_COURSE to local checkouts when you need reproducible builds.

The generator writes:
- public/data/catalog.json: unchanged Python catalog.
- public/data/sql/catalog.json: complete SQL course route.
- public/data/sql/nb/sql__...json: guide, starter SQL, optional grading fingerprints.
- public/course/sql/fixtures/base.sql and edge.sql: disposable data generated from the SQL repository's exact test fixtures.
- public/course/sql/tools/{run_sql.py,schema_practice.py}: existing behavior checker dependencies (no reference solutions).
- public/data/course-files.json: the Python worker's file manifest, extended with SQL fixtures and the DDL checker.

Generated files are ignored by git. Regenerate when the source course changes.

## Browser execution and scoring

SQL uses the **same isolated Pyodide worker** as Python, with its existing
sqlite3 package. Every SQL run creates a new in-memory database from the
base fixture; no SQL query is sent to the hosting server or to an actual
production database. Query runs support read/write SQL against this disposable
data. Editing and progress persist only in browser localStorage.

The 48 read-only query challenges execute on *two* datasets and compare
canonical SHA-256 hashes of the entire ordered output (including columns'
value positions and NULLs) to answers computed from the source course's
reference queries at build time. SQL reference solutions are NOT bundled.
The checker limits SQL length, statement counts, result size, and SQLite
virtual-machine steps. This is an **educational browser sandbox** and does
not provide server-side anti-cheat or a security boundary for malicious SQL.

The four schema design challenges run the repository's existing behavioral
checker against a fresh SQLite database. It verifies constraints, indexes
and invalid operations; it is not a query-output comparison.

The nine PostgreSQL labs show their reference scripts and explicitly do
**not** attempt execution in SQLite. Run them in a disposable PostgreSQL 16+
environment. The Lab does not provision PostgreSQL or require SQL credentials.

## Routes and progress

- Shelf: /learn and /learn/sql
- Guided lesson example: /lesson/sql/basics/lessons/00_select
- Interview challenge: /lesson/sql/basics/interview/B01
- Schema design: /lesson/sql/advanced/schema/C01
- PostgreSQL deep dive: /lesson/sql/advanced/postgresql/01_jsonb

Existing Python lesson IDs remain unchanged. SQL IDs are prefixed sql/, so
completion, saved editor edits and last-lesson pointers do not conflict.
The progress export format remains swarmladderlab.v1.

## Testing and deployment gate

Run from a checkout with both source repositories:

    python build/prepare.py --course ../python-notebook --sql-course ../SQL
    COURSE=../python-notebook SQL_COURSE=../SQL python -m pytest tests -q
    npm ci
    npm run typecheck
    npm run build
    npm test
    npx playwright install chromium
    npm run test:e2e

The GitHub Actions workflow fetches both course repositories on every PR.
The SQL importer tests assert all 105 activities, all 48 challenge digests,
the base/edge fixtures, schema checker resources and the PostgreSQL
read-only flag. Playwright checks lesson loading, execution, grading,
persistence and dialect separation.

**Before merging:** review CI and manually try B01 (correct and incorrect
answers), a schema task C01, a multi-statement guided lesson, a PostgreSQL
reference page, mobile layout, and progress export/import. Then deploy to
the staging Worker, run the browser suite against its URL, and release the
reviewed commit after staging passes. This PR does not deploy or change a
production database.

## Maintenance and limits

- To update SQL content, change SwarmLadder/SQL, run its own checks, then
  rebuild Lab assets from the new course revision.
- If a source challenge changes, the builder regenerates two expected digests
  from the same reference SQL used by the source course's checker.
- Use controlled/pinned course revisions for reproducible production releases.
- No learner accounts or hosted SQL databases are added in this integration.
- A future dedicated database service should use strong isolation and server
  grading, not arbitrary SQL on a shared production database.
