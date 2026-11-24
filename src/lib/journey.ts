// Turns the flat catalog into a route: an ordered climb with a current rung.
// The route powers progressive discovery: learners see where they are and what
// is next, while the rest of the course stays folded until they get there.
import type { Catalog, Item, Level } from "./course";
import { doneIn, isFinished, read, reachedIn } from "../features/progress/store";

export type StopKind = "lesson" | "practice" | "example" | "build";
export type StopState = "done" | "current" | "started" | "ahead";
export type Stop = {
  item: Item;
  kind: StopKind;
  level: Level;
  index: number; // position within its level
  done: number;
  total: number;
  state: StopState;
};
export type LevelRoute = { level: Level; stops: Stop[]; done: number; total: number; complete: boolean; chapter: number };
export type Route = { levels: LevelRoute[]; current: Stop | null; all: Stop[] };

const KIND: Record<string, StopKind> = {
  notebooks: "lesson",
  exercises: "practice",
  worked_examples: "example",
  projects: "build",
  interview: "build", // DSA timed mock interviews
  resources: "example", // DSA mastery guides
};
const ORDER: StopKind[] = ["lesson", "practice", "example", "build"];
const PRACTICE_FIRST: StopKind[] = ["practice", "lesson", "build", "example"];

export function lessonNumber(title: string) {
  const m = title.match(/^(\d+)\s*[—-]\s*(.*)$/);
  return m ? { number: m[1], name: m[2] } : { number: "", name: title };
}

// "Practice Pack — Control Flow" and "Practice 2 — Iteration…" read better as just the topic.
export const topic = (title: string) => title.replace(/^Practice(?: Pack| \d+)?\s*[—–-]\s*/i, "");

export function isComplete(item: Item) {
  return item.graded > 0 ? Math.min(item.graded, doneIn(item.id).length) >= item.graded : isFinished(item.id);
}

export function route(catalog: Catalog): Route {
  const last = read().last;
  // Python and DSA teach through runnable checked cells inside lessons.
  // C and Java begin with genuine checks; reading is available after practice.
  // DSA lessons now teach with checked cells too, so DSA follows the Python order.
  const priority = /\/(?:C|Java)$/.test(catalog.course ?? "") ? PRACTICE_FIRST : ORDER;
  const all: Stop[] = [];
  const levels = catalog.levels.map((level, chapter) => {
    const stops: Stop[] = [];
    for (const kind of priority)
      for (const section of level.sections)
        if (KIND[section.id] === kind)
          for (const item of section.items) {
            const done = Math.min(item.graded, doneIn(item.id).length);
            const complete = isComplete(item);
            const started = done > 0 || reachedIn(item.id) > 0 || last === item.id;
            stops.push({ item, kind, level, index: stops.length, done, total: item.graded, state: complete ? "done" : started ? "started" : "ahead" });
          }
    all.push(...stops);
    const total = stops.reduce((n, s) => n + s.total, 0);
    const done = stops.reduce((n, s) => n + s.done, 0);
    return { level, stops, done, total, complete: stops.every((s) => s.state === "done"), chapter: chapter + 1 };
  });
  const lastStop = all.find((s) => s.item.id === last && s.state !== "done");
  const current = lastStop ?? all.find((s) => s.state !== "done") ?? null;
  if (current) current.state = "current";
  return { levels, current, all };
}

// Which stops of a level to show, and what to fold away.
export function visibleWindow(stops: Stop[], current: Stop | null, ahead = 3) {
  const here = current ? stops.indexOf(current) : -1;
  const firstOpen = stops.findIndex((s) => s.state !== "done");
  const anchor = here >= 0 ? here : firstOpen >= 0 ? firstOpen : stops.length;
  const doneBefore = stops.slice(0, anchor).filter((s) => s.state === "done");
  const shown = stops.slice(0, anchor).filter((s) => s.state !== "done").concat(stops.slice(anchor, anchor + ahead + 1));
  const hidden = stops.slice(anchor + ahead + 1);
  return { doneBefore, shown, hidden };
}
