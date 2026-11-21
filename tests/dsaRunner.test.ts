import test from "node:test";
import assert from "node:assert/strict";
import { dsaPythonScript, parseDsaResults, DSA_RESULT_PREFIX } from "../src/lib/dsaRunner.ts";

test("DSA harness transports arbitrary learner Python as JSON data", () => {
  const source = "def solve(x):\n    return x + 'quotes \" and apostrophe \\' and slash \\\\'\n";
  const code = dsaPythonScript(source, [{ args: ["a"], expected: "ab" }]);
  assert.ok(code.includes("exec(_swl_payload['source'], _swl_ns)"));
  assert.ok(code.includes("allow_nan=False"));
  assert.ok(code.includes("sort_keys=True"));
  assert.ok(code.includes("copy as _swl_copy"));
  assert.ok(code.includes("quotes"));
  assert.ok(!code.includes("\n    return x + 'quotes"));
});

test("Published DSA checker never accepts incomplete results", () => {
  const prefix = DSA_RESULT_PREFIX;
  const list = [{ ok: true, expected: [0, 1], actual: [0, 1] },
                { ok: false, expected: 2, actual: 3 }];
  assert.deepEqual(parseDsaResults("hello\n" + prefix + JSON.stringify(list) + "\n", 2), list);
  assert.throws(() => parseDsaResults("hello", 2), /did not return/);
  assert.throws(() => parseDsaResults(prefix + JSON.stringify(list), 3), /Incomplete/);
  assert.throws(() => parseDsaResults(prefix + "[]", 1), /Incomplete/);
  assert.throws(() => parseDsaResults(prefix + '[{"ok":"true"}]', 1), /Incomplete/);
});
