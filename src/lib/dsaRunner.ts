/** Published-case DSA grader utilities. This is not hidden judging.
 * All Python runs in the site's Pyodide Web Worker, not on the server.
 */
export const DSA_RESULT_PREFIX = "__SWL_DSA_PUBLIC_CASES__=";
export type DsaCase = { args: unknown[]; expected: unknown };
export type DsaCaseResult = {
  ok: boolean;
  actual?: unknown;
  expected?: unknown;
  error?: string;
};

export function dsaPythonScript(source: string, cases: DsaCase[]): string {
  // The user source and cases enter Python as JSON *data*, not as literal
  // interpolated Python statements. The code is exec'd only in Pyodide.
  const payload = JSON.stringify(JSON.stringify({ source, cases }));
  return [
    "import json as _swl_json, copy as _swl_copy",
    "_swl_payload = _swl_json.loads(" + payload + ")",
    "_swl_results = []",
    "try:",
    "    _swl_ns = {'__name__': '__dsa_practice__'}",
    "    exec(_swl_payload['source'], _swl_ns)",
    "    _swl_solve = _swl_ns.get('solve')",
    "    if not callable(_swl_solve):",
    "        raise ValueError('Define a callable solve(...) function.')",
    "    for _swl_case in _swl_payload['cases']:",
    "        try:",
    "            _swl_actual = _swl_solve(*_swl_copy.deepcopy(_swl_case['args']))",
    "            _swl_actual_json = _swl_json.loads(_swl_json.dumps(_swl_actual, allow_nan=False))",
    "            _swl_canon = lambda value: _swl_json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)",
    "            _swl_results.append({'ok': _swl_canon(_swl_actual_json) == _swl_canon(_swl_case['expected']),",
    "                                 'actual': _swl_actual_json, 'expected': _swl_case['expected']})",
    "        except Exception as _swl_case_error:",
    "            _swl_results.append({'ok': False, 'error': type(_swl_case_error).__name__ + ': ' + str(_swl_case_error),",
    "                                 'expected': _swl_case['expected']})",
    "except Exception as _swl_error:",
    "    _swl_results = [{'ok': False, 'error': type(_swl_error).__name__ + ': ' + str(_swl_error)}]",
    "print('" + DSA_RESULT_PREFIX + "' + _swl_json.dumps(_swl_results, allow_nan=False))",
  ].join("\n");
}

export function parseDsaResults(stdout: string, expectedCount: number): DsaCaseResult[] {
  const at = stdout.lastIndexOf(DSA_RESULT_PREFIX);
  if (at < 0) throw new Error("The Python worker did not return test results.");
  const line = stdout.slice(at + DSA_RESULT_PREFIX.length).split("\n", 1)[0];
  const results: unknown = JSON.parse(line);
  if (!Array.isArray(results) || results.length !== expectedCount ||
      !results.every((r) => typeof r === "object" && r !== null &&
        typeof (r as DsaCaseResult).ok === "boolean")) {
    throw new Error("Incomplete result set returned by the Python worker.");
  }
  return results as DsaCaseResult[];
}
