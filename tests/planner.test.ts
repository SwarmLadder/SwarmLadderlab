import { test } from "node:test";
import assert from "node:assert/strict";
import { executionPlan } from "../src/features/notebook/plan.ts";

const cell = (id: string, deps: string[] = []) => ({type:"code", id, kind:id === "setup" ? "setup" : "code", source:"", requires_cells:deps} as const);
test("select shared prerequisites once in source order", () => {
  const nb = {id:"test", folder:"", title:"", graded:[], cells:[cell("setup"),cell("a"),cell("irrelevant"),cell("b",["a"]),cell("target",["b","a"])]};
  assert.deepEqual(executionPlan(nb,"target").map(c => c.id), ["setup","a","b","target"]);
});
test("reject missing, forward and cyclic references", () => {
  for (const dep of ["missing","later","target"]) {
    const nb = {id:"test", folder:"", title:"", graded:[], cells:[cell("target",[dep]),cell("later",["target"])]};
    assert.throws(() => executionPlan(nb,"target"), /earlier/);
  }
});
