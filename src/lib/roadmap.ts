// Learning roadmaps, built from real course data.
// Python: lessons are grouped into stages in course order, and dependencies come only
// from the curriculum's concept graph (curriculum/concepts.json). Other courses have no
// prerequisite metadata, so their roadmap follows the course's own levels and sections
// as a suggested order, with no invented dependencies.
import type { Catalog } from "./course";

export type Concept = { id: string; concept: string; skill: string; difficulty: string; prerequisites: string[]; evidence: string };
export type RoadmapItem = { id: string; title: string; graded: number; skill?: string; prerequisites: string[]; challenges: string[] };
export type Stage = {
  id: string;
  title: string;
  summary: string;
  items: RoadmapItem[];
  projects: { id: string; title: string }[];
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

export function buildRoadmap(course: string, catalog: Catalog, concepts: Concept[] = []): Roadmap {
  // Which lesson holds each challenge, from the catalog's practice packs.
  const challenges = new Map<string, string[]>();
  for (const pack of Object.values(catalog.workbooks ?? {})) {
    for (const [name, lesson] of Object.entries(pack.lessons ?? {})) {
      if (pack.exercises.includes(name)) challenges.set(lesson, [...(challenges.get(lesson) ?? []), name]);
    }
  }
  if (course === "python" && concepts.length) {
    const byId = new Map(concepts.map((c) => [c.id, c]));
    const stageOf = new Map<string, string>();
    const levels: RoadmapLevel[] = catalog.levels.map((level) => {
      const lessons = level.sections.find((s) => s.id === "notebooks" || s.title === "Lessons")?.items ?? [];
      const projects = level.sections.find((s) => s.title === "Projects")?.items ?? [];
      const defs = PYTHON_STAGES.filter((s) => s[3] === level.id);
      const stages = defs.map(([id, title, summary, , from, to], index) => {
        const items = lessons.filter((l) => lessonNumber(l.id) >= from && lessonNumber(l.id) <= to).map((l) => {
          stageOf.set(l.id, id);
          const c = byId.get(l.id);
          return { id: l.id, title: l.title, graded: l.graded, skill: c?.skill, prerequisites: c?.prerequisites ?? [], challenges: challenges.get(l.id) ?? [] };
        });
        // A level's projects apply what the whole level taught, so they follow its last stage.
        return { id, title, summary, items, projects: index === defs.length - 1 ? projects.map(({ id, title }) => ({ id, title })) : [], dependsOn: [] as string[] };
      });
      return { id: level.id, title: level.title, stages };
    });
    for (const stage of levels.flatMap((l) => l.stages)) {
      const deps = new Set(stage.items.flatMap((i) => i.prerequisites.map((p) => stageOf.get(p))).filter((s): s is string => Boolean(s) && s !== stage.id));
      stage.dependsOn = [...deps];
    }
    return { course, graph: true, levels };
  }
  return {
    course,
    graph: false,
    levels: catalog.levels.map((level) => ({
      id: level.id,
      title: level.title,
      stages: level.sections.map((section) => ({
        id: level.id + ":" + section.id,
        title: section.title,
        summary: "",
        items: section.items.map((i) => ({ id: i.id, title: i.title, graded: i.graded, prerequisites: [], challenges: challenges.get(i.id) ?? [] })),
        projects: [],
        dependsOn: [],
      })),
    })),
  };
}
