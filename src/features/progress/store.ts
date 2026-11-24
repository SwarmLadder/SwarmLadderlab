import pythonRevision from "../../../build/python-revision.json" with { type: "json" };
import upstream from "../../../build/upstream.json" with { type: "json" };
// DSA evidence is current only for the pinned DSA curriculum revision.
export const dsaRevision: string = upstream["Data-Structures-Algorithms"];
export const STORE = "swarmladderlab.v1";
export type Validation = "not_attempted" | "passed" | "failed" | "execution_error" | "stale";
export type Evidence = { status: Validation; cells: string[]; revision: string; independent?: boolean };
type State = {
  version?: number;
  current?: Record<string, Evidence>;
  done?: Record<string, number>;
  code?: Record<string, Record<string, string>>;
  last?: string | null;
  reached?: Record<string, number>; // furthest step revealed in each lesson
  finished?: Record<string, number>; // lessons read to the end (for ungraded pages)
};
export function read(): State {
  try {
    const state: State = JSON.parse(localStorage.getItem(STORE) || "{}") || {};
    return { ...state, version: 2 };

  } catch {
    return {};
  }
}
function write(state: State) {
  localStorage.setItem(STORE, JSON.stringify(state));
  if (typeof window !== "undefined") dispatchEvent(new Event("swl-progress"));
}
// v1 timestamps remain historical. Code checks acquire current evidence on rerun.
const pythonCheck = (id: string, key: string) =>
  /^(basics|intermediate|advanced)\//.test(id) && /^(ex\d+$|wb:|mastery:)/.test(key);
// Every DSA result except reading a page is a code or quiz check.
const dsaCheck = (id: string, key: string) => id.startsWith("dsa/") && key !== "read";
export const isCheck = (id: string, key: string) => pythonCheck(id, key) || dsaCheck(id, key);
// The revision a check's evidence must carry to count as current, by course.
export const revisionFor = (key = "") => key.startsWith("dsa/") ? dsaRevision : pythonRevision;
export function currentStatus(e?: Evidence, key?: string) {
  return e && (e.revision === revisionFor(key) ? e.status : "stale");
}
export function doneIn(id: string, s: Pick<State, "done" | "current"> = read()) {
  return Object.keys(s.done ?? {}).filter(k => k.startsWith(id + "#"))
    .map(k => k.slice(id.length + 1))
    .filter(k => !isCheck(id, k) || currentStatus(s.current?.[id + "#" + k], id + "#" + k) === "passed");
}
export function validate(id: string, key: string, evidence: Evidence) {
  const s = read();
  s.version = 2;
  (s.current ??= {})[id + "#" + key] = evidence;
  if (evidence.status === "passed") (s.done ??= {})[id + "#" + key] ??= Date.now();
  write(s);
}
export function mark(id: string, keys: string[]) {
  const s = read();
  s.done ??= {};
  for (const key of keys) s.done[id + "#" + key] ??= Date.now();
  write(s);
}
export function save(id: string, cell: string, value?: string) {
  const s = read();
  for (const [key, evidence] of Object.entries(s.current ?? {})) {
    if (key.startsWith(id + "#") && evidence.cells.includes(cell)) evidence.status = "stale";
  }
  s.code ??= {};
  s.code[id] ??= {};
  if (value === undefined) delete s.code[id][cell];
  else s.code[id][cell] = value;
  write(s);
}
export function setLast(id: string) {
  write({ ...read(), last: id });
}
export const reachedIn = (id: string) => read().reached?.[id] ?? 0;
export function reach(id: string, step: number) {
  const s = read();
  s.reached ??= {};
  if ((s.reached[id] ?? 0) < step) {
    s.reached[id] = step;
    write(s);
  }
}
export const isFinished = (id: string) => Boolean(read().finished?.[id]);
export function finish(id: string) {
  const s = read();
  s.finished ??= {};
  s.finished[id] ??= Date.now();
  write(s);
}
// Lets components re-render when progress changes in this or another tab.
export function onProgress(listener: () => void) {
  const handler = (e: Event) => {
    if (e.type !== "storage" || (e as StorageEvent).key === STORE) listener();
  };
  addEventListener("storage", handler);
  addEventListener("swl-progress", handler);
  return () => {
    removeEventListener("storage", handler);
    removeEventListener("swl-progress", handler);
  };
}
export function exportData() {
  return JSON.stringify(
    { format: STORE, exported: new Date().toISOString(), ...read() },
    null,
    1,
  );
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function importData(text: string) {
  const data = JSON.parse(text);
  if (
    !record(data) ||
    data.format !== STORE ||
    (data.current !== undefined && (!record(data.current) || data.version !== 2 ||
      !Object.values(data.current).every(e => record(e) && typeof e.revision === "string" &&
        ["passed","failed","execution_error","not_attempted","stale"].includes(String(e.status)) &&
        Array.isArray(e.cells) && e.cells.every(c => typeof c === "string")))) ||
    (data.last != null && typeof data.last !== "string") ||
    (data.done !== undefined &&
      (!record(data.done) ||
        !Object.values(data.done).every((v) => typeof v === "number"))) ||
    !["reached", "finished"].every(
      (k) =>
        data[k] === undefined ||
        (record(data[k]) &&
          Object.values(data[k] as object).every((v) => typeof v === "number")),
    ) ||
    (data.code !== undefined &&
      (!record(data.code) ||
        !Object.values(data.code).every(
          (v) =>
            record(v) && Object.values(v).every((s) => typeof s === "string"),
        )))
  )
    throw Error("Choose a valid SwarmLadder Lab progress export.");
  delete data.format;
  delete data.exported;
  write(data);
}
export function graduatedKeys(text: string) {
  return [
    ...Array.from(
      text.matchAll(/✅ Exercise (\d+): correct/g),
      (m) => "ex" + m[1],
    ),
    ...Array.from(text.matchAll(/Q(\d+): ✅ correct/g), (m) => "q" + m[1]),
    ...Array.from(
      text.matchAll(/✅ (\w+): (?:all \d+ checks|the check) passed/g),
      (m) => "wb:" + m[1],
    ),
  ];
}
