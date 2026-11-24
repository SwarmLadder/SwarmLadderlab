import { test } from "node:test";
import assert from "node:assert/strict";
import { cell, items, layoutForest, layoutGraph, layoutHeap, layoutTree, nodeLabel, resolve, show, type Step } from "../src/lib/trace.ts";

const step: Step = {
  line: 3, event: "line", objects: {
    "1": { cls: "ListNode", fields: { value: 1, next: { $ref: "2" } } },
    "2": { cls: "ListNode", fields: { value: 2, next: null } },
    "9": { cls: "DSU", fields: { parent: [0, 0, 1] } },
  },
  frames: [
    { fn: "outer", line: 9, locals: { x: 1, self: { $ref: "9" } } },
    { fn: "inner", line: 3, locals: { x: 2, head: { $ref: "1" }, d: { $dict: [["a", 1]] }, inf: { $num: "inf" } } },
  ],
};

test("resolve reads the innermost frame and follows dotted paths through objects", () => {
  assert.equal(resolve(step, "x"), 2);
  assert.deepEqual(resolve(step, "self.parent"), [0, 0, 1]);
  assert.equal(resolve(step, "missing"), undefined);
});

test("values display as Python would write them", () => {
  assert.equal(show(resolve(step, "d")), "{'a': 1}");
  assert.equal(show(resolve(step, "inf")), "∞");
  assert.equal(show({ $tuple: [3, "B"] }), "(3, 'B')");
  assert.equal(cell({ $tuple: [3, 1] }), "3,1");
  assert.equal(show(true), "True");
  assert.deepEqual(items("abc"), ["a", "b", "c"]);
  assert.deepEqual(items({ $deque: [1, 2] }), [1, 2]);
});

test("trees, heaps and union-find forests lay out from real structure", () => {
  const tree = layoutTree([4, [2, [1, null, null], null], [6, null, null]], undefined, "list");
  assert.deepEqual(tree.map((n) => n.label), ["1", "2", "4", "6"]); // in-order columns
  assert.equal(tree.find((n) => n.label === "1")!.y, 2);
  const heap = layoutHeap([1, 3, 2, 7]);
  assert.equal(heap.find((n) => n.key === "3")!.parent, "1");
  const forest = layoutForest([0, 0, 1, 3]);
  assert.deepEqual(forest.filter((n) => !n.parent).map((n) => n.key).sort(), ["0", "3"]);
  assert.equal(forest.find((n) => n.key === "2")!.parent, "1");
});

test("graphs read adjacency dicts and weighted adjacency lists", () => {
  const g = layoutGraph({ $dict: [["A", ["B"]], ["B", []]] })!;
  assert.deepEqual(g.edges, [{ from: "A", to: "B", weight: undefined }]);
  const w = layoutGraph([[{ $tuple: [1, 4] }], []], "weighted-list")!;
  assert.deepEqual(w.edges, [{ from: "0", to: "1", weight: "4" }]);
  assert.equal(nodeLabel([0, { $num: "inf" }], "1"), "∞");
  assert.equal(nodeLabel({ $dict: [["A", 2]] }, "A"), "2");
});
