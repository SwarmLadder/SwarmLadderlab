import test from "node:test";
import assert from "node:assert/strict";
import { courseCompletion, summarizeCourse } from "../src/lib/courseDirectory.ts";
import type { Catalog } from "../src/lib/course.ts";
import type { Course } from "../src/lib/courses.ts";

const course: Course = {
  id: "sql", title: "SQL", language: "SQLite", blurb: "Practice databases.",
  status: "open", hue: "#705039",
};
const data: Catalog = {
  levels: [{
    id: "basics", title: "Basics", medal: "🥉", total: 2,
    sections: [
      { id: "notebooks", title: "Lessons", items: [{ id: "sql/basics/notebooks/00_select", title: "SELECT", graded: 0 }] },
      { id: "exercises", title: "Challenges", items: [
        { id: "sql/basics/interview/B01", title: "Products", graded: 1 },
        { id: "sql/basics/interview/B02", title: "Groups", graded: 1 },
      ] },
    ],
  }],
  workbooks: {},
};
test("derives counts and categories from the current source catalog", () => {
  const result = summarizeCourse(course, data);
  assert.equal(result.items.length, 3);
  assert.equal(result.checks, 2);
  assert.equal(result.levels, 1);
  assert.equal(summarizeCourse({ ...course, id: "pending", status: "soon" }).items.length, 0);
});
test("independent SQL progress cannot be credited from Python marks", () => {
  const result = summarizeCourse(course, data);
  const snapshot = {
    done: {
      "basics/notebooks/00_python_introduction#ex1": 1,
      "sql/basics/interview/B01#challenge": 1,
      "sql/basics/interview/B02extended#challenge": 1,
    },
    finished: { "sql/basics/notebooks/00_select": 1 },
    last: "sql/basics/interview/B01",
  };
  assert.deepEqual(courseCompletion(result, snapshot), {
    completed: 2, total: 3, percent: 67, resumeId: "sql/basics/interview/B01",
  });
  assert.equal(courseCompletion(result, { last: "basics/notebooks/00_python_introduction" }).resumeId, null);
});
test("zero-activity coming soon courses have zero-safe percentages", () => {
  assert.deepEqual(courseCompletion(summarizeCourse({ ...course, status: "soon" }), {}),
    { completed: 0, total: 0, percent: 0, resumeId: null });
});
