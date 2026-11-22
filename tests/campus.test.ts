import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { experiments, schools } from "../src/lib/campus.ts";
import { courses } from "../src/lib/courses.ts";

// The campus pages may only cite courses, lessons, projects and sections that exist
// in the generated catalogs, so nothing advertised is empty or invented.
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const catalogPath = (id: string) => id === "python" ? "public/data/catalog.json" : `public/data/${id}/catalog.json`;
const ids = (path: string) => new Set<string>(json(path).levels.flatMap((l: any) => l.sections.flatMap((s: any) => s.items.map((i: any) => i.id))));

test("every school course is open and has a generated catalog with activities", () => {
  for (const school of schools) {
    assert.ok(school.courses.length > 0, school.id);
    for (const id of school.courses) {
      assert.equal(courses.find((c) => c.id === id)?.status, "open", id);
      assert.ok(existsSync(catalogPath(id)) && ids(catalogPath(id)).size > 0, id);
    }
  }
  const all = schools.flatMap((s) => s.courses);
  assert.deepEqual([...new Set(all)].sort(), courses.filter((c) => c.status === "open").map((c) => c.id).sort(),
    "every open course belongs to exactly one school");
  assert.equal(all.length, new Set(all).size);
});

test("school highlights are real Python lessons or projects", () => {
  const python = ids(catalogPath("python"));
  for (const h of schools.flatMap((s) => s.highlights ?? [])) assert.ok(python.has(h.id), h.id);
});

test("experiments build on a real Advanced project section", () => {
  const studio = json("public/data/studio.json");
  for (const e of experiments) {
    assert.ok(studio.some((p: any) => p.id === e.project && p.level === "advanced"), e.project);
    const nb = json("public/data/nb/" + e.project.replaceAll("/", "__") + ".json");
    const text = nb.cells.filter((c: any) => c.type === "md").map((c: any) => c.html).join("\n");
    assert.ok(text.includes(e.section), e.section);
    assert.ok(e.method.length >= 2 && e.question.endsWith("?"));
  }
});

test("studio projects carry a brief, acceptance criteria and a source link", () => {
  const studio = json("public/data/studio.json");
  const projects = [...ids(catalogPath("python"))].filter((id) => id.includes("/projects/"));
  assert.deepEqual(studio.map((p: any) => p.id).sort(), projects.sort());
  for (const p of studio) {
    assert.ok(p.brief.length > 40, p.id);
    assert.ok(p.acceptance.length > 0, p.id);
    assert.match(p.source, /^https:\/\/github\.com\/SwarmLadder\/python-notebook\/blob\/main\/.+\.ipynb$/);
  }
});
