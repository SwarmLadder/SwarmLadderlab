import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRoadmap, type Concept } from "../src/lib/roadmap.ts";

const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const python = json("public/data/catalog.json");
const concepts: Concept[] = json("public/data/concepts.json");

test("every Python lesson sits in exactly one roadmap stage, in course order", () => {
  const map = buildRoadmap("python", python, concepts);
  const placed = map.levels.flatMap((l) => l.stages.flatMap((s) => s.items.map((i) => i.id)));
  const lessons = python.levels.flatMap((l: any) => l.sections.filter((s: any) => s.id === "notebooks").flatMap((s: any) => s.items.map((i: any) => i.id)));
  assert.deepEqual(placed, lessons);
  assert.equal(new Set(placed).size, placed.length);
  assert.ok(map.levels.flatMap((l) => l.stages).every((s) => s.items.length > 0));
});

test("Python dependencies come only from the curriculum's concept graph", () => {
  const map = buildRoadmap("python", python, concepts);
  const byId = new Map(concepts.map((c) => [c.id, c]));
  for (const item of map.levels.flatMap((l) => l.stages.flatMap((s) => s.items))) {
    assert.deepEqual(item.prerequisites, byId.get(item.id)?.prerequisites ?? []);
  }
  const control = map.levels[0].stages.find((s) => s.id === "control-flow")!;
  assert.ok(control.dependsOn.includes("fundamentals"));
  // Each level's projects follow its last stage only.
  const projects = map.levels.flatMap((l) => l.stages.flatMap((s) => s.projects.map((p) => p.id)));
  assert.equal(projects.length, 9);
});

test("other courses follow their own outline with no invented dependencies", () => {
  for (const id of ["sql", "git", "rust", "linux", "dsa", "c", "java"]) {
    const data = json(`public/data/${id}/catalog.json`);
    const map = buildRoadmap(id, data);
    assert.equal(map.graph, false);
    const stages = map.levels.flatMap((l) => l.stages);
    assert.equal(stages.length, data.levels.reduce((n: number, l: any) => n + l.sections.length, 0), id);
    assert.ok(stages.every((s) => s.dependsOn.length === 0 && s.items.every((i) => i.prerequisites.length === 0)), id);
  }
});
