# Swarm Campus MVP: audit and plan

"Swarm Campus" is a working product name. The repositories, domains and site title
are unchanged. The Lab is not an accredited institution and awards no degrees.

## What already served the campus journey

| Journey stage | Existing feature | Gap found |
|---|---|---|
| Discover | `/learn` course library with search, filters and progress | Courses were a flat list; nothing grouped them by discipline or suggested an order across courses. |
| Learn | `/lesson/*` for eight courses | No gap for this MVP. |
| Practice | Notebook checks and the multi-language `/playground` | An assessment ran hidden prerequisite cells without saying which. |
| Build | Python projects appeared as ordinary lesson items | No brief, acceptance criteria, tests to run or assessment type. Reading a project to the end marked it "finished". |
| Review & contribute | Footer links to two repositories | No contribution, review or reporting guidance in the product. |
| Advance | `/progress` and `/achievements` | No gap for this MVP. |

Mobile layouts and keyboard navigation were already covered by tests for the existing
pages; the new pages follow the same patterns and are tested at 390 px.

## What this MVP adds

- **Schools** (`/schools`): Software, Systems and Data Engineering. Each groups existing
  courses (every open course in exactly one school), with counts computed from the generated
  catalogs, progress, a next step, and Python lessons and projects relevant to data engineering.
- **Engineering Studio** (`/studio`): the nine Python projects, extracted at build time from the
  project notebooks and READMEs into `data/studio.json`: brief, skills, prerequisite, acceptance
  criteria, automatic or review-based assessment, source links, and package test commands.
  Project pages are never marked finished just because they were read.
- **Research experiments** (on `/studio#research`): three measurable questions built on Advanced
  project sections (concurrency limits, streaming memory, event replay). Each has a method and the
  evidence to report. They are open exercises, not published research.
- **Community** (`/community`): real GitHub pathways (issue templates, contribution guide,
  recognition and achievement workflows), peer-review guidance, standards and reporting. It states
  what is not offered.
- **Lab**: a check cell names the saved cells it runs with, linking to each.
- **Navigation**: Schools, Courses, Playground, Studio, Community and Progress, in journey order.

## Not built, deliberately

Accounts, profiles, messaging, mentoring, study groups, submissions and review queues need
authentication, privacy, abuse prevention and moderation design first. Schools for AI or security
wait until those courses exist.

## Next priorities

1. A review workflow for Studio projects (GitHub-based: a template repository and a review label).
2. Cross-course prerequisites in the catalogs, so schools can order courses from data.
3. Bring the home page's course list in line with the eight open courses (it omits Java).
