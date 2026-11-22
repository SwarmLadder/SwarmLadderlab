// Swarm Campus (working name): schools group the existing courses, and the Studio
// links the Python curriculum's real projects. Every id here must exist in the
// generated catalogs; tests/campus.test.ts fails otherwise. Counts are never
// written here: pages compute them from the catalogs.
import type { CourseId } from "../app/catalog";

export type School = {
  id: string;
  title: string;
  focus: string;
  leadsTo: string;
  learn: string[];
  start: string;
  courses: CourseId[];
  // Lessons and projects from a course that belong to this school's discipline.
  highlights?: { id: string; why: string }[];
};

export const schools: School[] = [
  {
    id: "software",
    title: "Software Engineering",
    focus: "Design programs that stay correct as they grow: language fluency, testing, algorithms and version control.",
    leadsTo: "Building, testing and maintaining applications and services.",
    learn: [
      "Python from first variables to typed, tested, asynchronous services",
      "Data structures and algorithms with public test cases",
      "Java implementations checked against expected output",
      "Git history, branches and pull-request workflows",
    ],
    start: "No prior experience needed. Python Basics starts from your first line of code.",
    courses: ["python", "dsa", "java", "git"],
  },
  {
    id: "systems",
    title: "Systems Engineering",
    focus: "Work close to the machine: memory, native compilation, ownership and the operating system.",
    leadsTo: "Native programs, operating systems and the infrastructure software runs on.",
    learn: [
      "C17 with native compiler tests you run locally",
      "Rust ownership, error handling and Cargo projects",
      "Linux, Bash and service operations",
    ],
    start: "Recommended: comfort writing small programs, for example Python Basics.",
    courses: ["c", "rust", "linux"],
  },
  {
    id: "data",
    title: "Data Engineering",
    focus: "Model, move and protect data: SQL, pipelines, transactions and reproducible processing.",
    leadsTo: "Databases, data pipelines and processing you can trust.",
    learn: [
      "SQL queries, schema design and backend data patterns",
      "JSON and CSV pipelines that reject bad records",
      "Transactions, integrity and idempotent processing",
    ],
    start: "SQL starts from zero. The Python data lessons assume Python Basics.",
    courses: ["sql"],
    highlights: [
      { id: "intermediate/notebooks/13_json_csv_and_data_pipelines", why: "Parse, validate and aggregate JSON and CSV" },
      { id: "intermediate/notebooks/15_sqlite_and_transactions", why: "SQLite from Python with transactions" },
      { id: "advanced/notebooks/17_sqlite_transactions_integrity", why: "Constraints and atomic batches" },
      { id: "intermediate/projects/02_offline_api_etl_pipeline", why: "Project: an offline API and ETL pipeline" },
      { id: "advanced/projects/02_streaming_text_analytics", why: "Project: streaming analytics with measurements" },
      { id: "advanced/projects/03_transactional_event_processor", why: "Project: idempotent event processing" },
    ],
  },
];

// Research experiments: a measurable question answered with the project's own code.
// `section` must be a heading in that project notebook.
export type Experiment = {
  id: string;
  theme: string;
  project: string;
  section: string;
  question: string;
  method: string[];
  evidence: string;
};

export const experiments: Experiment[] = [
  {
    id: "concurrency-limit",
    theme: "Concurrency and asynchronous scheduling",
    project: "advanced/projects/01_async_crawler_simulator",
    section: "Step 2 — Bounded asynchronous fetch simulation",
    question: "How do total crawl time and the number of fetches in flight change as the concurrency limit grows?",
    method: [
      "Fix the fake page graph and the simulated latency so every run sees the same work.",
      "Run the crawl with limits 1, 2, 4 and 8, recording wall time and the peak number of fetches in flight.",
      "Repeat each limit several times and report the median, not a single run.",
    ],
    evidence: "A table of limit, median time and peak in-flight fetches, and a conclusion on where extra concurrency stops paying off.",
  },
  {
    id: "streaming-memory",
    theme: "Streaming data and performance",
    project: "advanced/projects/02_streaming_text_analytics",
    section: "Step 5 — Memory observation with tracemalloc",
    question: "At what input size does the streaming pipeline use clearly less peak memory than a materialised list, and what does it cost in time?",
    method: [
      "Generate deterministic inputs of increasing size.",
      "Measure peak memory with tracemalloc and time with timeit for the streaming and the list-based version.",
      "Check that both versions produce identical counts before comparing them.",
    ],
    evidence: "Peak memory and time against input size for both versions, with the size where the trade-off changes.",
  },
  {
    id: "event-replay",
    theme: "Database consistency and event replay",
    project: "advanced/projects/03_transactional_event_processor",
    section: "5. Database consistency and failure-path tests",
    question: "Does replaying the same event log, with duplicates and a failure part-way through, always produce the same totals?",
    method: [
      "Build an event log that contains duplicate ids and one invalid event.",
      "Replay it in several shuffled orders into fresh in-memory databases, injecting a failure mid-batch.",
      "Compare the final totals and processed ids across every replay.",
    ],
    evidence: "Totals that are identical across replays, or a reproducible counterexample with the fix and a regression test.",
  },
];

// Real places to collaborate. Nothing here is a Lab feature: each link opens GitHub.
const course = "https://github.com/SwarmLadder/python-notebook";
const lab = "https://github.com/SwarmLadder/SwarmLadderlab";
export const pathways = {
  ask: course + "/issues/new?template=stuck-or-confused.md",
  fix: course + "/issues/new?template=content-fix.md",
  contributing: course + "/blob/main/CONTRIBUTING.md",
  recognition: course + "/blob/main/RECOGNITION.md",
  contributors: course + "/blob/main/CONTRIBUTORS.md",
  achievements: course + "/blob/main/ACHIEVEMENTS.md",
  courseIssues: course + "/issues",
  coursePulls: course + "/pulls",
  labIssues: lab + "/issues",
  labPulls: lab + "/pulls",
  reporting: "https://docs.github.com/en/communities/maintaining-your-safety-on-github/reporting-abuse-or-spam",
};

// Studio project URLs: /studio/<slug>, e.g. "advanced/projects/03_transactional_event_processor"
// becomes "transactional-event-processor". Project names are unique across levels.
export const studioSlug = (projectId: string) => projectId.split("/").pop()!.replace(/^\d+_/, "").replaceAll("_", "-");
