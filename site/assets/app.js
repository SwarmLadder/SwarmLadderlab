// Shared helpers: catalog, progress stored in this browser, Python worker client.
export const COURSE_REPO = "https://github.com/SwarmLadder/python-notebook";
const STORE = "swarmladderlab.v1";

export async function loadCatalog() {
  return (await fetch("data/catalog.json")).json();
}

export async function loadNotebook(id) {
  const response = await fetch("data/nb/" + id.replaceAll("/", "__") + ".json");
  if (!response.ok) throw new Error("Unknown notebook: " + id);
  return response.json();
}

// ---------- progress (localStorage only; nothing leaves the browser) ----------
function read() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function write(state) { localStorage.setItem(STORE, JSON.stringify(state)); }

export const progress = {
  all() { const s = read(); return { done: s.done || {}, code: s.code || {}, last: s.last || null }; },
  isDone(nb, key) { return Boolean((read().done || {})[nb + "#" + key]); },
  markDone(nb, key) {
    const s = read(); s.done = s.done || {};
    if (!s.done[nb + "#" + key]) { s.done[nb + "#" + key] = Date.now(); write(s); return true; }
    return false;
  },
  doneIn(nb) { const prefix = nb + "#"; return Object.keys(read().done || {}).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)); },
  saveCode(nb, cellId, source) { const s = read(); s.code = s.code || {}; (s.code[nb] = s.code[nb] || {})[cellId] = source; write(s); },
  savedCode(nb, cellId) { return ((read().code || {})[nb] || {})[cellId]; },
  forgetCode(nb, cellId) { const s = read(); if (s.code && s.code[nb]) { delete s.code[nb][cellId]; write(s); } },
  setLast(nb) { const s = read(); s.last = nb; write(s); },
  export() { return JSON.stringify({ format: STORE, exported: new Date().toISOString(), ...read() }, null, 1); },
  import(text) {
    const data = JSON.parse(text);
    if (data.format !== STORE) throw new Error("This file isn't a SwarmLadderlab progress export.");
    delete data.format; delete data.exported; write(data);
  },
  reset() { localStorage.removeItem(STORE); },
};

// Turn a check's printed output into progress keys.
export function graduatedKeys(text) {
  const keys = [];
  for (const m of text.matchAll(/✅ Exercise (\d+): correct/g)) keys.push("ex" + m[1]);
  for (const m of text.matchAll(/Q(\d+): ✅ correct/g)) keys.push("q" + m[1]);
  for (const m of text.matchAll(/✅ (\w+): (?:all \d+ checks|the check) passed/g)) keys.push("wb:" + m[1]);
  return keys;
}

// ---------- Python worker client ----------
export class PythonRunner {
  constructor(onStatus) {
    this.onStatus = onStatus;
    this.pending = new Map();
    this.counter = 0;
    this.start();
  }
  start() {
    this.ready = new Promise((resolve, reject) => {
      this.worker = new Worker("assets/py-worker.js");
      this.worker.onmessage = (event) => {
        const m = event.data;
        if (m.type === "ready") { this.onStatus(""); resolve(); }
        else if (m.type === "fatal") { this.onStatus("Python failed to load: " + m.text); reject(new Error(m.text)); }
        else if (m.type === "status") this.onStatus(m.text);
        else if (m.type === "stream") this.pending.get(m.id)?.onStream(m.name, m.text);
        else if (m.type === "done") { const job = this.pending.get(m.id); this.pending.delete(m.id); job?.resolve(m); }
      };
      this.worker.postMessage({ type: "init", base: new URL(".", location.href).href });
    });
  }
  async run(code, cwd, onStream) {
    await this.ready;
    const id = ++this.counter;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve, onStream });
      this.worker.postMessage({ type: "run", id, code, cwd });
    });
  }
  // Stop runaway code immediately: kill the worker and start a fresh Python.
  restart() {
    this.worker.terminate();
    for (const job of this.pending.values()) job.resolve({ error: "Stopped. Python was restarted, so run the cells above again.", stopped: true });
    this.pending.clear();
    this.start();
  }
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of children.flat()) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

export function levelStats(catalog, level) {
  const done = progress.all().done;
  let total = 0, completed = 0;
  for (const section of level.sections) {
    for (const item of section.items) {
      total += item.graded;
      completed += Object.keys(done).filter((k) => k.startsWith(item.id + "#")).length;
    }
  }
  return { total, completed: Math.min(completed, total) };
}
