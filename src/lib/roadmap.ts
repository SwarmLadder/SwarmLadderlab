// Learning roadmaps, built from real course data.
// Python: lessons are grouped into stages in course order, and dependencies come only
// from the curriculum's concept graph (curriculum/concepts.json). DSA: stages and
// prerequisites come from build/dsa_concepts.json, where the build checks each edge
// against the lessons' own text and every edge carries a reason. Other courses have no
// prerequisite metadata, so their roadmap follows the course's own levels and sections
// as a suggested order, with no invented dependencies.
import type { Catalog } from "./course";

export type Concept = { id: string; concept: string; skill: string; difficulty: string; prerequisites: string[]; evidence: string };
export type ItemKind = "lesson" | "practice" | "example" | "project";
export type RoadmapItem = {
  id: string; title: string; graded: number; kind: ItemKind; href?: string;
  skill?: string; prerequisites: string[]; why?: Record<string, string>; challenges: string[];
};
export type DsaConcepts = {
  stages: { id: string; title: string; summary: string; level: string; lessons: string[] }[];
  concepts: { id: string; concept: string; skill: string; prerequisites: string[]; why: Record<string, string>; stage: string }[];
  practice?: Record<string, string[]>; // lesson id -> its interview problems and worked examples
};
export type Stage = {
  id: string;
  title: string;
  summary: string;
  items: RoadmapItem[];
  dependsOn: string[]; // stage ids, from lesson prerequisites (Python only)
};
export type RoadmapLevel = { id: string; title: string; stages: Stage[] };
export type Roadmap = { course: string; graph: boolean; levels: RoadmapLevel[] };

// Python stages: [id, title, summary, level, first lesson number, last lesson number].
// Ranges follow the lesson order of each level; tests/roadmap.test.ts checks every
// lesson belongs to exactly one stage.
const PYTHON_STAGES: [string, string, string, string, number, number][] = [
  ["fundamentals", "Fundamentals", "Values, names, operators, strings and printing.", "basics", 0, 4],
  ["control-flow", "Control flow", "Decisions and loops.", "basics", 5, 6],
  ["collections", "Collections", "Lists, tuples, sets and dictionaries.", "basics", 7, 9],
  ["functions", "Functions", "Reusable code, scope and the built-ins.", "basics", 10, 11],
  ["errors-files", "Errors, files and modules", "Handle failure, read and write files, use the standard library.", "basics", 12, 14],
  ["problem-solving", "Debugging and problem solving", "Find bugs, plan solutions, review the basics.", "basics", 15, 17],
  ["components", "Software components", "Clean workflow, comprehensions, classes and dataclasses.", "intermediate", 0, 4],
  ["abstractions", "Iteration and abstraction", "Iterators, generators, closures, context managers and functional tools.", "intermediate", 5, 9],
  ["data-contracts", "Data contracts", "Type hints, logging, regular expressions and data pipelines.", "intermediate", 10, 13],
  ["testing", "Testing", "Unit tests and mocking.", "intermediate", 14, 14],
  ["services", "Databases and services", "SQLite, HTTP clients and command-line tools.", "intermediate", 15, 17],
  ["performance", "Performance and review", "Complexity, profiling and the intermediate review.", "intermediate", 18, 19],
  ["internals", "Python internals", "The data model, descriptors, memory, typing and plugins.", "advanced", 0, 4],
  ["concurrency", "Concurrency and resilience", "asyncio, task groups, threads, processes and retries.", "advanced", 5, 9],
  ["quality", "Systems quality", "Profiling, algorithms, architecture, security and testing.", "advanced", 10, 14],
  ["production", "Production engineering", "Observability, API contracts, data integrity, delivery and the capstone.", "advanced", 15, 19],
];

const lessonNumber = (id: string) => Number(id.split("/").pop()!.slice(0, 2));

// Section ids to the kind of activity they hold, for every course's catalog.
const KIND: Record<string, ItemKind> = {
  notebooks: "lesson", exercises: "practice", worked_examples: "example", projects: "project", interview: "practice", resources: "example",
};
type CatalogItem = Catalog["levels"][number]["sections"][number]["items"][number];
const plain = (i: CatalogItem, kind: ItemKind, href?: string): RoadmapItem =>
  ({ id: i.id, title: i.title, graded: i.graded, kind, href, prerequisites: [], challenges: [] });
function linkStages(levels: RoadmapLevel[]) {
  const stageOf = new Map(levels.flatMap((l) => l.stages.flatMap((s) => s.items.map((i) => [i.id, s.id] as const))));
  for (const stage of levels.flatMap((l) => l.stages)) {
    const deps = new Set(stage.items.flatMap((i) => i.prerequisites.map((p) => stageOf.get(p))).filter((s): s is string => Boolean(s) && s !== stage.id));
    stage.dependsOn = [...deps];
  }
}

// Every activity in the catalog appears exactly once (tests/roadmap.test.ts checks this),
// so the roadmap can serve as each course's main page.
export function buildRoadmap(course: string, catalog: Catalog, concepts: Concept[] = [], dsa?: DsaConcepts): Roadmap {
  // Which lesson holds each challenge, from the catalog's practice packs.
  const challenges = new Map<string, string[]>();
  for (const pack of Object.values(catalog.workbooks ?? {})) {
    for (const [name, lesson] of Object.entries(pack.lessons ?? {})) {
      if (pack.exercises.includes(name)) challenges.set(lesson, [...(challenges.get(lesson) ?? []), name]);
    }
  }
  if (course === "python" && concepts.length) {
    const byId = new Map(concepts.map((c) => [c.id, c]));
    const levels: RoadmapLevel[] = catalog.levels.map((level) => {
      const lessons = level.sections.find((s) => s.id === "notebooks")?.items ?? [];
      const rest = level.sections.filter((s) => s.id !== "notebooks");
      const defs = PYTHON_STAGES.filter((s) => s[3] === level.id);
      const stages: Stage[] = defs.map(([id, title, summary, , from, to], index) => {
        const items: RoadmapItem[] = lessons.filter((l) => lessonNumber(l.id) >= from && lessonNumber(l.id) <= to).map((l) => {
          const c = byId.get(l.id);
          return { ...plain(l, "lesson"), skill: c?.skill, prerequisites: c?.prerequisites ?? [], challenges: challenges.get(l.id) ?? [] };
        });
        // Worked examples and projects apply what the whole level taught: they close its last stage.
        if (index === defs.length - 1)
          for (const section of rest)
            for (const i of section.items) items.push(plain(i, KIND[section.id] ?? "example"));
        return { id, title, summary, items, dependsOn: [] };
      });
      return { id: level.id, title: level.title, stages };
    });
    linkStages(levels);
    return { course, graph: true, levels };
  }
  if (course === "dsa" && dsa) {
    const byId = new Map(dsa.concepts.map((c) => [c.id, c]));
    const all = new Map(catalog.levels.flatMap((l) => l.sections.flatMap((s) => s.items.map((i) => [i.id, { i, kind: KIND[s.id] ?? "example" }] as const))));
    const placed = new Set<string>();
    const levels: RoadmapLevel[] = catalog.levels.map((level) => {
      const defs = dsa.stages.filter((s) => s.level === level.id);
      const stages: Stage[] = defs.map((def) => {
        const items: RoadmapItem[] = [];
        for (const id of def.lessons) {
          const lesson = all.get(id);
          if (!lesson) continue;
          const c = byId.get(id);
          items.push({ ...plain(lesson.i, "lesson"), skill: c?.skill, prerequisites: c?.prerequisites ?? [], why: c?.why });
          placed.add(id);
          // The lesson's own interview problems and worked examples follow it.
          for (const pid of dsa.practice?.[id] ?? []) {
            const p = all.get(pid);
            if (p && !placed.has(pid)) { items.push(plain(p.i, p.kind)); placed.add(pid); }
          }
        }
        return { id: def.id, title: def.title, summary: def.summary, items, dependsOn: [] };
      });
      // Projects, mock interviews and guides combine the whole level: they close its last stage.
      const last = stages[stages.length - 1];
      for (const section of level.sections)
        for (const i of section.items)
          if (!placed.has(i.id)) { last.items.push(plain(i, KIND[section.id] ?? "example")); placed.add(i.id); }
      return { id: level.id, title: level.title, stages };
    });
    linkStages(levels);
    return { course, graph: true, levels };
  }
  return {
    course,
    graph: false,
    levels: catalog.levels.map((level) => ({
      id: level.id,
      title: level.title,
      // Some catalogs reuse a section id within a level, so the position keeps stage ids unique.
      stages: level.sections.map((section, n) => ({
        id: `${level.id}:${n}:${section.id}`,
        title: section.title,
        summary: "",
        items: section.items.map((i) => ({ ...plain(i, KIND[section.id] ?? "example"), challenges: challenges.get(i.id) ?? [] })),
        dependsOn: [],
      })),
    })),
  };
}
