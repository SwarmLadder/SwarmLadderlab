# Visual QA: Phase 6 design overhaul

Audit of `main` at `a433c24`, served at https://swarmladder.bitpyrus.workers.dev, on 2026-11-22.
The 19 routes (home, course directory, two course pages, schools, studio, community,
playground, eight lessons, progress, achievements and a 404) were captured with Playwright
at 1440, 768 and 390 px in light and dark themes, for a first-time visitor
(`scripts/visual-audit.mjs`). Of the supplied preview URLs,
`campus-mvp-swarmladder.bitpyrus.workers.dev` serves the campus branch and
`mvp-swarmladder.bitpyrus.workers.dev` returns 404 (no such deployment).

Selected "before" captures are in `before/`; "after" captures are in `after/`.

## Findings before the redesign

| # | Where | Problem | Cause |
|---|---|---|---|
| 1 | Every page at 768 px | Page scrolls sideways by 146 px; "Progress" and the theme toggle are cut off | Six nav items, no menu breakpoint between phone and desktop (`Header.tsx`, `.primary-nav`) |
| 2 | `/progress` at 390 px | Cards overflow by 72 px; calendar and route rows clipped | Fixed-width calendar grid and route strips |
| 3 | `/playground` in light theme | IDE stays dark: dark tab bar, editor, console and status bar on a light page | `.ide` redefines every colour token with hard-coded dark values (`pages.css`) |
| 4 | `/playground` | A banner of implementation text ("Python runs in an isolated browser worker…") takes the first row | `.ide-mode-notice` copy |
| 5 | Home, courses shelf | Book spines overlap the featured-course panel; the DSA title overflows its spine | Shelf width fixed for seven books; nine are drawn |
| 6 | Home, chapters | Lesson timeline renders at very low opacity | Scroll-reveal starts invisible |
| 7 | `/learn` | Every course shows a generic line icon (`</>`, a database, a wrench for Java and JavaScript); nine identical white cards | `CourseLibrary.tsx` uses Lucide symbols |
| 8 | `/learn` | Featured panel is a decorative gradient with circles, unrelated to learner state | `.library-feature` |
| 9 | `/learn/python` (dark) | "CHAPTER 1" wraps onto two lines; the roman-numeral badge sits outside the panel | Chapter header grid |
| 10 | `/studio` | Nine dense cards, each with two disclosure widgets; no project detail page | `Studio.tsx` |
| 11 | `/schools`, `/community` | Long explanatory paragraphs, same journey pills on every page, bordered boxes everywhere | Campus MVP layout |
| 12 | Brand | The mark reads as "#" at 16–32 px: thin swarm dots and arcs vanish, leaving two slanted rails crossed by rungs | `Brand.tsx`, `favicon.svg` |
| 13 | `/progress` | Four pastel stat cards in unrelated colours | `pages.css` |
| 14 | Global | Colour values are hard-coded in 226 places across `field.css`, `lesson.css`, `pages.css` and `library.css` | No semantic surface/IDE tokens |

Lessons (Python, SQL, DSA, C, Rust, Java, Git, Linux) were usable and readable; their issues
were spacing and hierarchy rather than defects, so behaviour is preserved and only the shared
visual layer changes.
