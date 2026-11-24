// Decoding and layout for traces recorded by build/dsa_runtime/visual.py.
// A trace is real Python execution: these helpers only read it, never invent state.

export type Raw = unknown;
export type Frame = { fn: string; line: number; locals: Record<string, Raw> };
export type Step = { line: number; event: string; frames: Frame[]; objects: Record<string, { cls: string; fields: Record<string, Raw> }>; returned?: Raw };
export type Trace = { steps: Step[]; truncated: boolean; result: Raw; error: string | null; stdout: string };

export type View = {
  kind: "array" | "map" | "stack" | "queue" | "linked" | "tree" | "heap" | "graph" | "table" | "dsu" | "vars";
  of: string | string[];
  label?: string;
  pointers?: string[];
  range?: [string, string, "closed" | "half-open"];
  focus?: string;
  current?: string;
  labels?: string;
  indexInto?: string;
  show?: "first";
  stack?: string;
  format?: "list" | "weighted-list";
  directed?: boolean;
  next?: string;
  value?: string;
  cell?: [string, string];
  rows?: string;
  cols?: string;
};

const isObj = (v: Raw): v is Record<string, Raw> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The variable (or dotted path through objects) in the innermost frame that defines it. */
export function resolve(step: Step | undefined, name: string): Raw | undefined {
  if (!step) return undefined;
  const [head, ...rest] = name.split(".");
  for (let i = step.frames.length - 1; i >= 0; i--) {
    const locals = step.frames[i].locals;
    if (!(head in locals)) continue;
    let value: Raw = locals[head];
    for (const part of rest) {
      if (!isObj(value) || typeof value.$ref !== "string") return undefined;
      value = step.objects[value.$ref]?.fields[part];
    }
    return value;
  }
  return undefined;
}

/** A sequence view of lists, tuples, deques and strings (a string is its characters). */
export function items(v: Raw): Raw[] | null {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return [...v];
  if (isObj(v)) for (const k of ["$tuple", "$deque", "$set"]) if (Array.isArray(v[k])) return v[k] as Raw[];
  return null;
}

export function pairs(v: Raw): [Raw, Raw][] | null {
  return isObj(v) && Array.isArray(v.$dict) ? (v.$dict as [Raw, Raw][]) : null;
}

/** Short display text for any traced value. */
export function show(v: Raw, step?: Step, depth = 0): string {
  if (v === null || v === undefined) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return depth ? "'" + v + "'" : v; // inside a container, quote like Python
  if (Array.isArray(v)) return "[" + v.map((x) => show(x, step, depth + 1)).join(", ") + "]";
  if (isObj(v)) {
    if (typeof v.$num === "string") return v.$num === "inf" ? "∞" : v.$num === "-inf" ? "−∞" : v.$num;
    if (Array.isArray(v.$tuple)) return "(" + v.$tuple.map((x) => show(x, step, depth + 1)).join(", ") + ")";
    if (Array.isArray(v.$deque)) return "deque([" + v.$deque.map((x) => show(x, step, depth + 1)).join(", ") + "])";
    if (Array.isArray(v.$set)) return "{" + v.$set.map((x) => show(x, step, depth + 1)).join(", ") + "}";
    if (Array.isArray(v.$dict)) return "{" + (v.$dict as [Raw, Raw][]).map(([k, x]) => show(k, step, depth + 1) + ": " + show(x, step, depth + 1)).join(", ") + "}";
    if (typeof v.$ref === "string") {
      const o = step?.objects[v.$ref];
      return o ? o.cls + (o.fields.value !== undefined ? "(" + show(o.fields.value, step, depth + 1) + ")" : "") : "object";
    }
    if (typeof v.$repr === "string") return v.$repr;
  }
  return String(v);
}

/** Compact label for a cell: strings unquoted, tuples as "a,b". */
export function cell(v: Raw, step?: Step): string {
  const t = isObj(v) && Array.isArray(v.$tuple) ? v.$tuple : null;
  return t ? t.map((x) => show(x, step, 1)).join(",") : show(v, step, 0);
}

export const same = (a: Raw, b: Raw) => JSON.stringify(a) === JSON.stringify(b);
export const asIndex = (v: Raw) => (typeof v === "number" && Number.isInteger(v) ? v : null);

// ---------- layout ----------

export type TreeNode = { key: string; label: string; x: number; y: number; parent?: string; raw: Raw };

/** Lay out a binary tree given as nested [value, left, right] lists or objects with left/right. */
export function layoutTree(root: Raw, step: Step | undefined, format: "list" | "object"): TreeNode[] {
  const nodes: TreeNode[] = [];
  let column = 0;
  const kids = (n: Raw): [Raw, Raw, Raw] | null => {
    if (format === "list") return Array.isArray(n) && n.length === 3 ? (n as [Raw, Raw, Raw]) : null;
    if (isObj(n) && typeof n.$ref === "string") {
      const f = step?.objects[n.$ref]?.fields;
      return f ? [f.value ?? f.val ?? f.key, f.left ?? null, f.right ?? null] : null;
    }
    return null;
  };
  const visit = (n: Raw, depth: number, path: string, parent?: string) => {
    const k = kids(n);
    if (!k || depth > 8) return;
    visit(k[1], depth + 1, path + "L", path);
    nodes.push({ key: path, label: show(k[0], step), x: column++, y: depth, parent, raw: n });
    visit(k[2], depth + 1, path + "R", path);
  };
  visit(root, 0, "r");
  return nodes;
}

/** A heap stored in a list, as a complete binary tree (index i has children 2i+1 and 2i+2). */
export function layoutHeap(list: Raw[]): TreeNode[] {
  const nodes: TreeNode[] = [];
  const visit = (i: number, depth: number, lo: number, hi: number) => {
    if (i >= list.length) return;
    nodes.push({ key: String(i), label: cell(list[i]), x: (lo + hi) / 2, y: depth, parent: i ? String((i - 1) >> 1) : undefined, raw: list[i] });
    visit(2 * i + 1, depth + 1, lo, (lo + hi) / 2);
    visit(2 * i + 2, depth + 1, (lo + hi) / 2, hi);
  };
  visit(0, 0, 0, 1);
  return nodes;
}

/** A union–find parent array as a forest: one tree per root, nodes ordered by index. */
export function layoutForest(parent: Raw[]): TreeNode[] {
  const n = parent.length;
  const children: number[][] = Array.from({ length: n }, () => []);
  const roots: number[] = [];
  parent.forEach((p, i) => (p === i || asIndex(p) === null ? roots.push(i) : children[p as number].push(i)));
  const nodes: TreeNode[] = [];
  let column = 0;
  const visit = (i: number, depth: number, seen: Set<number>) => {
    if (seen.has(i) || depth > n) return;
    seen.add(i);
    const start = column;
    for (const c of children[i]) visit(c, depth + 1, seen);
    const x = children[i].length ? (start + column - 1) / 2 : column++;
    nodes.push({ key: String(i), label: String(i), x, y: depth, parent: depth ? String(parent[i]) : undefined, raw: i });
  };
  const seen = new Set<number>();
  for (const r of roots) visit(r, 0, seen);
  return nodes;
}

export type Graph = { nodes: { key: string; label: string; x: number; y: number }[]; edges: { from: string; to: string; weight?: string }[] };

/** Nodes of an adjacency dict ({u: [v...]}) or weighted list ([[(v, w)...]...]) on a circle. */
export function layoutGraph(adj: Raw, format?: "list" | "weighted-list"): Graph | null {
  const entries: [string, Raw[]][] = [];
  const dict = pairs(adj);
  if (dict) for (const [k, v] of dict) entries.push([show(k), items(v) ?? []]);
  else if (Array.isArray(adj)) adj.forEach((v, i) => entries.push([String(i), items(v) ?? []]));
  else return null;
  const keys = entries.map(([k]) => k);
  const edges: Graph["edges"] = [];
  for (const [from, list] of entries) {
    for (const item of list) {
      const t = format === "weighted-list" ? items(item) : null;
      const to = show(t ? t[0] : item);
      if (!keys.includes(to)) keys.push(to);
      edges.push({ from, to, weight: t ? show(t[1]) : undefined });
    }
  }
  const n = keys.length;
  const nodes = keys.map((key, i) => ({ key, label: key, x: 0.5 + 0.4 * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), y: 0.5 + 0.4 * Math.sin((2 * Math.PI * i) / n - Math.PI / 2) }));
  return { nodes, edges };
}

/** Label for a graph node from a dict ({node: value}) or a list indexed by node number. */
export function nodeLabel(labels: Raw, key: string, step?: Step): string | null {
  const dict = pairs(labels);
  if (dict) {
    const hit = dict.find(([k]) => show(k) === key);
    return hit ? show(hit[1], step) : null;
  }
  const list = items(labels);
  const i = Number(key);
  return list && Number.isInteger(i) && i < list.length ? show(list[i], step) : null;
}
