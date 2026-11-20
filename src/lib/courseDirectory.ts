import type { Catalog, Item } from "./course";
import type { Course } from "./courses";

export type CourseOverview = {
  course: Course;
  items: Pick<Item, "id" | "graded">[];
  levels: number;
  checks: number;
};
export type ProgressSnapshot = {
  done?: Record<string, number>;
  finished?: Record<string, number>;
  last?: string | null;
};

export function summarizeCourse(course: Course, data?: Catalog): CourseOverview {
  const items = data?.levels.flatMap((level) => level.sections.flatMap(
    (section) => section.items.map(({ id, graded }) => ({ id, graded }))
  )) ?? [];
  return { course, items, levels: data?.levels.length ?? 0,
    checks: items.reduce((sum, item) => sum + item.graded, 0) };
}

// All courses share one progress format but their full activity IDs are distinct.
export function courseCompletion(summary: CourseOverview, snapshot: ProgressSnapshot) {
  const keys = Object.keys(snapshot.done ?? {});
  const completed = summary.items.reduce((n, item) => {
    if (!item.graded) return n + Number(Boolean(snapshot.finished?.[item.id]));
    const marks = keys.filter((key) => key.startsWith(item.id + "#")).length;
    return n + Number(marks >= item.graded);
  }, 0);
  const total = summary.items.length;
  const last = snapshot.last;
  const resumeId = last && summary.items.some((item) => item.id === last) ? last : null;
  return { completed, total, percent: total ? Math.round(completed * 100 / total) : 0, resumeId };
}
