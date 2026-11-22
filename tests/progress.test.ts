import pythonRevision from "../build/python-revision.json" with {type:"json"};
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  STORE,
  validate,
  exportData,
  importData,
  graduatedKeys,
  doneIn,
  mark,
  read,
  save,
  setLast,
} from "../src/features/progress/store.ts";
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    },
  });
});
test("v1 export keeps last lesson, exact code and original timestamps", () => {
  const state = {
    done: { "lesson#ex2": 1720000000000 },
    code: { lesson: { cell: "print(2)" } },
    last: "lesson",
  };
  importData(
    JSON.stringify({ format: STORE, exported: "2024-07-03", ...state }),
  );
  mark("lesson", ["ex2"]);
  assert.deepEqual(read(), { ...state, version: 2 });
  save("lesson", "cell", "");
  setLast("workbook");
  assert.equal(read().code?.lesson.cell, "");
  assert.equal(JSON.parse(exportData()).format, STORE);
  save("lesson", "cell");
  assert.equal(read().code?.lesson.cell, undefined);
  assert.deepEqual(doneIn("lesson"), ["ex2"]);
});
test("bad imports preserve existing progress", () => {
  setLast("lesson");
  for (const text of ["{", "{}", JSON.stringify({ format: STORE, code: [] })])
    assert.throws(() => importData(text));
  assert.equal(read().last, "lesson");
});
test("recognizes exercise, quiz and workbook results", () =>
  assert.deepEqual(
    graduatedKeys(
      "✅ Exercise 2: correct\nQ1: ✅ correct\n✅ demo: all 3 checks passed",
    ),
    ["ex2", "q1", "wb:demo"],
  ));


test("legacy Python passes are history; dependent edits revoke current evidence across backups", () => {
  const id = "basics/notebooks/test", key = "ex2";
  importData(JSON.stringify({ format: STORE, done: { [id + "#ex2"]: 1, [id + "#q1"]: 2 }, code: { [id]: { dep: "old" } } }));
  assert.deepEqual(doneIn(id), ["q1"]);
  const evidence = {cells: ["dep","target"], revision: pythonRevision};
  validate(id, key, {...evidence, status: "passed"});
  save(id, "dep", "new");
  importData(exportData());
  assert.equal(read().current?.[id + "#ex2"].status, "stale");
  validate(id, key, {...evidence, status: "failed"});
  assert.deepEqual(doneIn(id), ["q1"]);
  validate(id, key, {...evidence, status: "passed"});
  assert.deepEqual(doneIn(id), ["ex2","q1"]);
  assert.equal(read().done?.[id + "#ex2"], 1);
  validate(id, key, {...evidence, revision:"old", status:"passed"});
  assert.deepEqual(doneIn(id), ["q1"]);
});
