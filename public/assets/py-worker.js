// Runs Python (Pyodide) off the main thread so the page never freezes.
// Messages in:  {type: "init", base}  {type: "run", id, code, cwd}
// Messages out: {type: "ready"} {type: "status", text} {type: "stream", id, name, text}
//               {type: "done", id, error, friendly}
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/";
importScripts(PYODIDE + "pyodide.js");

let py = null;
let namespace = null;
let pytestReady = false;
let currentId = null;

const status = (text) => postMessage({ type: "status", text });

async function init(base) {
  status("Loading Python (first visit downloads about 10 MB)…");
  py = await loadPyodide({ indexURL: PYODIDE });
  py.setStdout({ batched: (text) => postMessage({ type: "stream", id: currentId, name: "stdout", text: text + "\n" }) });
  py.setStderr({ batched: (text) => postMessage({ type: "stream", id: currentId, name: "stderr", text: text + "\n" }) });
  status("Loading course files…");
  await py.loadPackage(["sqlite3", "micropip"]);
  const files = await (await fetch(base + "data/course-files.json")).json();
  await Promise.all(files.map(async (relative) => {
    const response = await fetch(base + "course/" + relative);
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
{"__name__": "__main__"}
`);
  postMessage({ type: "ready" });
}

async function ensurePytest() {
  if (pytestReady) return;
  status("Installing pytest for the checks (one time, a few seconds)…");
  await py.runPythonAsync("import micropip\nawait micropip.install('pytest')");
  pytestReady = true;
  status("");
}

function friendlyError(message) {
  if (message.includes("can't start new thread")) {
    return "Browsers can't start threads, so this cell needs real Python. Open it in Jupyter, Codespaces or Colab (see the links at the top).";
  }
  if (message.includes("BlankNotFilled") || message.includes("'___'") || message.includes("got ___")) {
    return "✏️ Fill in every ___ blank in this cell, then run it again.";
  }
  return null;
}

async function run(id, code, cwd) {
  currentId = id;
  try {
    if (/\bcheck\(\s*'/.test(code) || code.includes("check.summary") || code.includes("from check import")) {
      await ensurePytest();
    }
    py.globals.set("__swl_cwd", cwd);
    py.runPython("import os, sys\nos.makedirs(__swl_cwd, exist_ok=True)\nos.chdir(__swl_cwd)\nsys.path[:] = [p for p in sys.path if not p.startswith('/course/')]\nsys.path.insert(0, __swl_cwd)\n");
    await py.runPythonAsync(code, { globals: namespace });
    postMessage({ type: "done", id });
  } catch (error) {
    const message = String(error.message || error);
    // Keep the useful end of the Python traceback; hide Pyodide's own frames.
    const lines = message.split("\n").filter((line) => !line.includes("/lib/python3") && !line.includes("pyodide/"));
    postMessage({ type: "done", id, error: lines.join("\n").trim(), friendly: friendlyError(message) });
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
    await run(message.id, message.code, message.cwd);
  }
};
