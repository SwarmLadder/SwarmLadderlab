export const STORE = "swarmladderlab.v1";
type State = {
  done?: Record<string, number>;
  code?: Record<string, Record<string, string>>;
  last?: string | null;
};
export function read(): State {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}") || {};
  } catch {
    return {};
  }
}
function write(state: State) {
  localStorage.setItem(STORE, JSON.stringify(state));
}
export const doneIn = (id: string) =>
  Object.keys(read().done ?? {})
    .filter((k) => k.startsWith(id + "#"))
    .map((k) => k.slice(id.length + 1));
export function mark(id: string, keys: string[]) {
  const s = read();
  s.done ??= {};
  for (const key of keys) s.done[id + "#" + key] ??= Date.now();
  write(s);
}
export function save(id: string, cell: string, value?: string) {
  const s = read();
  s.code ??= {};
  s.code[id] ??= {};
  if (value === undefined) delete s.code[id][cell];
  else s.code[id][cell] = value;
  write(s);
}
export function setLast(id: string) {
  write({ ...read(), last: id });
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
    (data.last != null && typeof data.last !== "string") ||
    (data.done !== undefined &&
      (!record(data.done) ||
        !Object.values(data.done).every((v) => typeof v === "number"))) ||
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
