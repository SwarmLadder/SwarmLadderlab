// Runs Python (Pyodide) off the main thread so the page never freezes.
// Messages in:  {type: "init", base}  {type: "run", id, code, cwd}
//               {type: "lint", id, code}  {type: "complete", id, expr}
// Messages out: {type: "ready"} {type: "status", text} {type: "stream", id, name, text}
//               {type: "done", id, error, friendly, line}
//               {type: "lint", id, problems: [{line, col, message}]}  {type: "complete", id, names}
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/";
importScripts(PYODIDE + "pyodide.js");

let py = null;
let namespace = null;
let pytestReady = false;
let currentId = null;
let helpers = null;

const status = (text) => postMessage({ type: "status", text });

async function init(base) {
  status("Loading Python (first visit downloads about 10 MB)…");
  py = await loadPyodide({ indexURL: PYODIDE });
  py.setStdout({ batched: (text) => postMessage({ type: "stream", id: currentId, name: "stdout", text: text + "\n" }) });
  py.setStderr({ batched: (text) => postMessage({ type: "stream", id: currentId, name: "stderr", text: text + "\n" }) });
  status("Loading course files…");
  await py.loadPackage("sqlite3");
  const files = await (await fetch(base + "data/course-files.json")).json();
  await Promise.all(files.map(async (relative) => {
    const response = await fetch(base + "course/" + relative);
    if (!response.ok) throw Error("Missing course file: " + relative);
    const data = new Uint8Array(await response.arrayBuffer());
    const path = "/course/" + relative;
    py.FS.mkdirTree(path.slice(0, path.lastIndexOf("/")));
    py.FS.writeFile(path, data);
  }));
  namespace = py.runPython(`
import builtins, sys
def _no_input(prompt=""):
    raise RuntimeError("input() isn't available in the browser version. Assign the value directly, e.g. name = 'Ada'.")
builtins.input = _no_input

import ast as _ast, keyword as _kw, re as _re
def _swl_lint(src):
    try:
        _ast.parse(src)
        return []
    except SyntaxError as e:
        return [{"line": e.lineno or 1, "col": e.offset or 1, "message": f"{type(e).__name__}: {e.msg}"}]

_IDENT = _re.compile(r"^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$")
def _swl_complete(ns, expr):
    # Names for the editor: plain names, or attributes of an object that already exists.
    if "." not in expr:
        names = set(ns) | set(dir(builtins)) | set(_kw.kwlist)
        return sorted(n for n in names if not n.startswith("__"))
    base = expr.rsplit(".", 1)[0]
    if not _IDENT.match(base):
        return []
    head, *rest = base.split(".")
    obj = ns.get(head, getattr(builtins, head, None))
    if obj is None:
        return []
    try:
        for part in rest:
            obj = getattr(obj, part)
        return sorted(n for n in dir(obj) if not n.startswith("_"))
    except Exception:
        return []
{"__name__": "__main__"}
`);
  helpers = py.globals;
  postMessage({ type: "ready" });
}

async function ensurePytest() {
  if (pytestReady) return;
  status("Installing pytest for the checks (one time, a few seconds)…");
  // Report package progress in the status bar, not in the learner's output, and
  // turn a failed download into a clear error instead of a lingering message.
  const problems = [];
  try {
    await py.loadPackage("pytest", { messageCallback: () => {}, errorCallback: (text) => problems.push(text) });
    if (problems.length) throw Error(problems.join("\n"));
    py.runPython("import pytest");
  } catch (error) {
    status("");
    throw Error("Could not install pytest for the checks: " + String(error.message || error) + "\nCheck your connection and run the check again.");
  }
  pytestReady = true;
  status("");
}

function friendlyError(message) {
  if (message.includes("can't start new thread")) {
    return "Browsers can't start threads, so this cell needs real Python. Open it in Jupyter, Codespaces or Colab (see the links at the top).";
  }
  return null;
}

async function run(id, code, cwd, fresh, assessment) {
  currentId = id;
  try {
    if (fresh) {
      namespace.destroy();
      namespace = py.runPython('{"__name__": "__main__"}');
    }
    if (/\bcheck\(\s*'/.test(code) || code.includes("check.summary") || code.includes("from check import")) {
      await ensurePytest();
    }
    py.globals.set("__swl_cwd", cwd);
    py.runPython("import os, sys\nos.makedirs(__swl_cwd, exist_ok=True)\nos.chdir(__swl_cwd)\nsys.path[:] = [p for p in sys.path if not p.startswith('/course/')]\nsys.path.insert(0, __swl_cwd)\n");
    if (assessment) {
      // Observe calls to the course checker itself. Its caller remains the learner's
      // frame, which Exercises uses to locate the submitted implementation.
      py.globals.set("_swl_ns", namespace);
      py.globals.set("_swl_expected", assessment);
      py.runPython(`
import sys
from lesson import Exercises as _Exercises
_swl_checker = _swl_ns.get("check")
_swl_result = "not_attempted"
def _swl_grade(frame, event, arg):
    global _swl_result
    if event != "return" or frame.f_locals.get("self") is not _swl_checker:
        return
    if frame.f_code is _Exercises.__call__.__code__:
        number = frame.f_locals["number"]
        key = "wb:" + number if isinstance(number, str) else "ex" + str(number)
    elif frame.f_code is _Exercises.assess.__code__:
        key = "mastery:" + frame.f_locals["name"]
    else:
        return
    if key == _swl_expected:
        result = _swl_checker.last_result
        _swl_result = "passed" if result is True else "failed" if result is False else "not_attempted"
sys.setprofile(_swl_grade)
`);
    }
    try {
      const value = await py.runPythonAsync(code, { globals: namespace });
      value?.destroy?.();
    } finally {
      if (assessment) py.runPython("sys.setprofile(None)");
    }
    postMessage({ type: "done", id, assessment: assessment ? py.globals.get("_swl_result") : undefined });
  } catch (error) {
    const message = String(error.message || error);
    // Keep the useful end of the Python traceback; hide Pyodide's own frames.
    // Show the traceback as Python would for a script: only the learner's own frames.
    let lines = message.split("\n").filter((line) => !line.includes("/lib/python3") && !line.includes("pyodide/"));
    const first = lines.findIndex((line) => line.includes('File "<exec>"'));
    if (first > 0) lines = [lines[0], ...lines.slice(first)];
    // The last frame in the learner's own code ("<exec>") is the line to highlight.
    const frames = [...message.matchAll(/File "<exec>", line (\d+)/g)];
    const line = frames.length ? Number(frames[frames.length - 1][1]) : undefined;
    if (["BlankNotFilled", "NotImplementedError"].includes(error.type) ||
        (error.type === "NameError" && /NameError: name '___' is not defined\s*$/.test(message))) {
      postMessage({ type: "done", id, assessment: "not_attempted", friendly: "Finish the implementation and run it again." });
      return;
    }
    postMessage({ type: "done", id, error: lines.join("\n").trim(), friendly: friendlyError(message), line });
  } finally {
    currentId = null;
  }
}

onmessage = async (event) => {
  const message = event.data;
  if (message.type === "init") {
    try { await init(message.base); }
    catch (error) { postMessage({ type: "fatal", text: String(error) }); }
  } else if (message.type === "run") {
    await run(message.id, message.code, message.cwd, message.fresh, message.assessment);
  } else if (message.type === "lint") {
    let problems = [];
    try { problems = helpers.get("_swl_lint")(message.code).toJs({ dict_converter: Object.fromEntries }); } catch {}
    postMessage({ type: "lint", id: message.id, problems });
  } else if (message.type === "complete") {
    let names = [];
    try { names = helpers.get("_swl_complete")(namespace, message.expr).toJs(); } catch {}
    postMessage({ type: "complete", id: message.id, names });
  }
};
