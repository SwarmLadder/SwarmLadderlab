"use client";
// Steps through a real Python execution trace of a lesson's algorithm.
// Every state shown comes from build/dsa_runtime/visual.py running the code in Pyodide.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pause, Play, Eye } from "lucide-react";
import { CodeEditor } from "../../components/CodeEditor";
import type { Runner } from "../../workers/runner";
import {
  asIndex, cell, items, layoutForest, layoutGraph, layoutHeap, layoutTree, nodeLabel, pairs, resolve, same, show,
  type Raw, type Step, type Trace, type TreeNode, type View,
} from "../../lib/trace";

export type VisualCell = {
  id: string; source: string; driver: string; title: string; watch: string; views: View[]; steps?: number;
};
const MARK = "__SWL_TRACE__";
const PRELUDE_LINES = 4; // the two imports and two blank lines the build adds before the lesson's code

export function Visualizer({ cell: v, runner, folder, ready }: {
  cell: VisualCell; runner: { current: Runner | null }; folder: string; ready: boolean;
}) {
  const [source, setSource] = useState(v.source);
  const [driver, setDriver] = useState(v.driver);
  const [editing, setEditing] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [predict, setPredict] = useState(false);
  const [pending, setPending] = useState(false); // predict mode: the next line is shown, its effect is not
  const edited = source !== v.source || driver !== v.driver;

  async function run() {
    const session = runner.current;
    if (!session || busy) return;
    setBusy(true); setError(""); setPlaying(false); setPending(false);
    let out = "";
    const code = `from visual import trace_json\nprint(${JSON.stringify(MARK)} + trace_json(${JSON.stringify(source)}, ${JSON.stringify(driver)}))`;
    try {
      const result = await session.run(code, "/course/" + folder, (name, chunk) => { if (name === "stdout") out += chunk; });
      if (result.error || result.friendly) throw Error(result.friendly || result.error);
      const at = out.lastIndexOf(MARK);
      if (at < 0) throw Error("The trace did not finish.");
      const parsed: Trace = JSON.parse(out.slice(at + MARK.length));
      setTrace(parsed); setAt(0);
      if (parsed.error) setError("Your code raised " + parsed.error + " — the steps up to the error are shown.");
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  const steps = trace?.steps ?? [];
  const last = Math.max(0, steps.length - 1);
  const step = steps[at];
  const prev = at > 0 ? steps[at - 1] : undefined;
  const nextLine = pending ? steps[at + 1]?.line : undefined;
  function go(n: number) { setPending(false); setAt(Math.max(0, Math.min(last, n))); }
  function forward() {
    if (at >= last) return setPlaying(false);
    if (predict && !pending) return setPending(true);
    go(at + 1);
  }
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setAt((n) => (n >= last ? (setPlaying(false), n) : n + 1)), 650);
    return () => clearInterval(timer);
  }, [playing, last]);

  const box = useRef<HTMLDivElement>(null);
  function keys(e: React.KeyboardEvent) {
    if (!trace || (e.target as HTMLElement).closest(".cm-editor, input, textarea")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); forward(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1); }
    if (e.key === "Home") { e.preventDefault(); go(0); }
    if (e.key === "End") { e.preventDefault(); go(last); }
  }
  const lines = source.split("\n");
  const shownLine = step ? step.line : 0;

  return (
    <section className="viz" data-visual={v.id} aria-label={"Visualizer: " + v.title} ref={box} onKeyDown={keys} tabIndex={-1}>
      <header className="viz-head">
        <div>
          <p className="eyebrow">Trace · real execution</p>
          <h3>{v.title}</h3>
        </div>
        <div className="viz-actions">
          <label className="viz-predict"><input type="checkbox" checked={predict} onChange={(e) => { setPredict(e.target.checked); setPending(false); }} /> Predict before each step</label>
          <button type="button" className="mini" onClick={() => setEditing(!editing)} aria-pressed={editing}>{editing ? "Done editing" : "Edit code"}</button>
          <button type="button" className="mini strong" disabled={busy || !ready} onClick={run}>
            {busy ? "Tracing…" : trace ? (edited ? "Trace your version" : "Trace again") : ready ? "Run and trace" : "Python loading…"}
          </button>
        </div>
      </header>
      <p className="viz-watch"><b>Watch:</b> {v.watch}</p>
      <label className="viz-driver">
        <span>Call</span>
        {v.driver.includes("\n") ? (
          <textarea value={driver} spellCheck={false} rows={driver.split("\n").length} onChange={(e) => setDriver(e.target.value)} aria-label="Call to trace" />
        ) : (
          <input value={driver} spellCheck={false} onChange={(e) => setDriver(e.target.value)} aria-label="Call to trace" />
        )}
        {edited && <button type="button" className="mini" onClick={() => { setSource(v.source); setDriver(v.driver); }}>Reset</button>}
      </label>

      <div className="viz-body">
        <div className="viz-code">
          {editing ? (
            <CodeEditor value={source} onChange={setSource} onRun={run} runner={runner} label={"Code for " + v.title} />
          ) : (
            <ol className="viz-lines" aria-label="Code">
              {lines.map((text, i) => {
                const n = i + 1;
                if (n <= PRELUDE_LINES) return null; // the imports the build adds; line numbers stay Python's
                return (
                  <li key={i} value={n} className={(n === shownLine ? "now" : "") + (n === nextLine ? " next" : "")} aria-current={n === shownLine ? "step" : undefined}>
                    <code>{text || " "}</code>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="viz-state" aria-live="polite">
          {!trace && <p className="viz-empty">Run the trace to see each state. {v.steps ? `This run takes ${v.steps} steps.` : ""}</p>}
          {trace && step && (
            <>
              <p className="viz-where">
                Step <b>{at + 1}</b> of {steps.length}{trace.truncated ? " (trace stops at 600 steps)" : ""} · line {step.line}
                {step.event === "return" && <> · <b>{step.frames.at(-1)?.fn}</b> returns {show(step.returned, step)}</>}
              </p>
              {pending ? (
                <p className="viz-prompt" role="status">
                  Line {nextLine} runs next. What will change? <button type="button" className="mini strong" onClick={() => go(at + 1)}><Eye size={13} /> Reveal</button>
                </p>
              ) : null}
              <ol className="viz-calls" aria-label="Call stack">
                {step.frames.map((f, i) => <li key={i} className={i === step.frames.length - 1 ? "top" : ""}>{f.fn}</li>)}
              </ol>
              {v.views.map((view, i) => <ViewBox key={i} view={view} step={step} prev={prev} />)}
              {at === last && <p className="viz-result">Result: <code>{show(trace.result, step)}</code></p>}
            </>
          )}
          {error && <p className="viz-error" role="alert">{error}</p>}
        </div>
      </div>

      <div className="viz-controls" role="group" aria-label="Step controls">
        <button type="button" onClick={() => go(0)} disabled={!trace || at === 0} aria-label="First step"><ChevronsLeft size={16} /></button>
        <button type="button" onClick={() => go(at - 1)} disabled={!trace || at === 0} aria-label="Previous step"><ChevronLeft size={16} /></button>
        <button type="button" onClick={() => setPlaying(!playing)} disabled={!trace || predict} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
        <button type="button" onClick={forward} disabled={!trace || at === last} aria-label={pending ? "Reveal next step" : "Next step"}><ChevronRight size={16} /></button>
        <button type="button" onClick={() => go(last)} disabled={!trace || at === last} aria-label="Last step"><ChevronsRight size={16} /></button>
        <input type="range" min={0} max={last} value={at} disabled={!trace} onChange={(e) => go(Number(e.target.value))} aria-label="Step" />
      </div>
    </section>
  );
}

// ---------- views ----------

function ViewBox({ view, step, prev }: { view: View; step: Step; prev?: Step }) {
  const name = Array.isArray(view.of) ? view.of.join(" / ") : view.of;
  const body = renderView(view, step, prev);
  if (!body) return null;
  return (
    <figure className={"viz-view kind-" + view.kind}>
      <figcaption>{view.label ?? name}</figcaption>
      {body}
    </figure>
  );
}

function renderView(view: View, step: Step, prev?: Step) {
  const of = Array.isArray(view.of) ? view.of[0] : view.of;
  const value = resolve(step, of);
  const before = prev ? resolve(prev, of) : undefined;
  switch (view.kind) {
    case "vars": {
      const names = Array.isArray(view.of) ? view.of : [view.of];
      const shown = names.map((n) => [n, resolve(step, n), prev ? resolve(prev, n) : undefined] as const).filter(([, x]) => x !== undefined);
      if (!shown.length) return null;
      return <dl className="viz-vars">{shown.map(([n, x, b]) => (
        <div key={n} className={prev && !same(x, b) ? "changed" : ""}><dt>{n}</dt><dd>{show(x, step, 1)}</dd></div>
      ))}</dl>;
    }
    case "array": return value === undefined ? null : <ArrayView view={view} list={items(value) ?? []} before={items(before)} step={step} />;
    case "map": {
      const p = pairs(value);
      if (!p) return null;
      const old = pairs(before);
      if (!p.length) return <p className="viz-none">empty</p>;
      return <table className="viz-map"><tbody>{p.map(([k, x], i) => {
        const was = old?.find(([ok]) => same(ok, k));
        return <tr key={i} className={!was ? "added" : !same(was[1], x) ? "changed" : ""}><th>{show(k, step, 1)}</th><td>{show(x, step, 1)}</td></tr>;
      })}</tbody></table>;
    }
    case "stack": case "queue": {
      const list = items(value);
      if (!list) return null;
      const into = view.indexInto ? items(resolve(step, view.indexInto)) : null;
      const text = (x: Raw) => view.show === "first" && Array.isArray(x) ? show(x[0], step) : into && asIndex(x) !== null ? `${x}: ${show(into[x as number], step, 1)}` : cell(x, step);
      if (!list.length) return <p className="viz-none">empty</p>;
      const ordered = view.kind === "stack" ? [...list].reverse() : list;
      return <ol className={"viz-" + view.kind}>{ordered.map((x, i) => (
        <li key={i} className={i === 0 ? "end" : ""}>{text(x)}</li>
      ))}<span className="viz-end-label">{view.kind === "stack" ? "← top" : ""}</span></ol>;
    }
    case "linked": return <LinkedView view={view} step={step} />;
    case "tree": {
      const nodes = layoutTree(value, step, view.format === "list" ? "list" : "object");
      const current = view.current ? resolve(step, view.current) : undefined;
      const onStack = view.stack ? items(resolve(step, view.stack)) ?? [] : [];
      return <TreeSvg nodes={nodes} mark={(n) => same(n.raw, current) ? "now" : onStack.some((s) => same(s, n.raw)) ? "held" : ""} />;
    }
    case "heap": {
      const list = items(value);
      if (!list) return null;
      if (!list.length) return <p className="viz-none">empty</p>;
      return <><TreeSvg nodes={layoutHeap(list)} mark={(n) => n.key === "0" ? "now" : ""} />
        <ArrayView view={{ kind: "array", of: of }} list={list} before={items(before)} step={step} /></>;
    }
    case "dsu": {
      const parent = items(value);
      if (!parent) return null;
      const focus = view.focus ? resolve(step, view.focus) : undefined;
      return <TreeSvg nodes={layoutForest(parent)} mark={(n) => n.raw === focus ? "now" : parent[Number(n.key)] === Number(n.key) ? "root" : ""} />;
    }
    case "graph": return <GraphView view={view} step={step} adj={value} />;
    case "table": return <TableView view={view} step={step} grid={value} before={before} />;
  }
}

function ArrayView({ view, list, before, step }: { view: View; list: Raw[]; before: Raw[] | null; step: Step }) {
  const pointers = (view.pointers ?? []).map((p) => [p, asIndex(resolve(step, p))] as const).filter(([, i]) => i !== null) as [string, number][];
  let lo = -1, hi = -1;
  if (view.range) {
    const a = asIndex(resolve(step, view.range[0])), b = asIndex(resolve(step, view.range[1]));
    if (a !== null && b !== null) { lo = a; hi = view.range[2] === "closed" ? b : b - 1; }
  }
  const focus = view.focus ? resolve(step, view.focus) : undefined;
  if (!list.length && !pointers.length) return <p className="viz-none">empty</p>;
  const width = Math.max(list.length, ...pointers.map(([, i]) => i + 1));
  return (
    <div className="viz-array" role="list">
      {Array.from({ length: width }, (_, i) => {
        const x = list[i];
        const changed = before && i < list.length && (i >= before.length || !same(before[i], x));
        const here = pointers.filter(([, p]) => p === i).map(([n]) => n);
        return (
          <div key={i} role="listitem" className={"viz-cell" + (i >= lo && i <= hi ? " in" : "") + (changed ? " changed" : "") + (i >= list.length ? " past" : "") + (focus !== undefined && same(x, focus) ? " focus" : "")}>
            <span className="viz-i">{i}</span>
            <span className="viz-v">{i < list.length ? cell(x, step) : ""}</span>
            <span className="viz-p">{here.join(" ")}</span>
          </div>
        );
      })}
    </div>
  );
}

function LinkedView({ view, step }: { view: View; step: Step }) {
  const names = Array.isArray(view.of) ? view.of : [view.of];
  const next = view.next ?? "next", value = view.value ?? "value";
  return (
    <div className="viz-linked">
      {names.map((name) => {
        const chain: { ref: string; label: string }[] = [];
        let node = resolve(step, name) as Record<string, Raw> | null | undefined;
        const seen = new Set<string>();
        while (node && typeof node.$ref === "string" && !seen.has(node.$ref) && chain.length < 20) {
          seen.add(node.$ref);
          const o = step.objects[node.$ref];
          chain.push({ ref: node.$ref, label: show(o?.fields[value], step) });
          node = o?.fields[next] as Record<string, Raw> | null;
        }
        return (
          <p key={name} className="viz-chain"><b>{name}</b> →{" "}
            {chain.map((c) => <span key={c.ref} className="viz-node">{c.label}</span>)}
            <span className="viz-null">{seen.size === 20 || (node && typeof node.$ref === "string") ? "… (cycle)" : "None"}</span>
          </p>
        );
      })}
    </div>
  );
}

function TreeSvg({ nodes, mark }: { nodes: TreeNode[]; mark: (n: TreeNode) => string }) {
  if (!nodes.length) return <p className="viz-none">empty</p>;
  const maxX = Math.max(...nodes.map((n) => n.x)), maxY = Math.max(...nodes.map((n) => n.y));
  const unit = maxX <= 1 && nodes.length > 2 ? 1 : 0; // heaps use fractional x in [0, 1]
  const W = Math.max(220, (unit ? Math.pow(2, maxY) : maxX + 1) * 54), H = (maxY + 1) * 58;
  const px = (n: TreeNode) => unit ? 20 + n.x * (W - 40) : 27 + n.x * 54;
  const py = (n: TreeNode) => 26 + n.y * 58;
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  return (
    <svg className="viz-tree" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={"Tree: " + nodes.map((n) => n.label).join(", ")}>
      {nodes.map((n) => { const p = n.parent ? byKey.get(n.parent) : undefined; return p ? <line key={"e" + n.key} x1={px(p)} y1={py(p)} x2={px(n)} y2={py(n)} /> : null; })}
      {nodes.map((n) => (
        <g key={n.key} className={"tn " + mark(n)} transform={`translate(${px(n)},${py(n)})`}>
          <circle r={17} />
          <text dy="0.35em" textAnchor="middle">{n.label.length > 6 ? n.label.slice(0, 6) + "…" : n.label}</text>
        </g>
      ))}
    </svg>
  );
}

function GraphView({ view, step, adj }: { view: View; step: Step; adj: Raw }) {
  const g = useMemo(() => layoutGraph(adj, view.format === "weighted-list" ? "weighted-list" : "list"), [adj, view.format]);
  if (!g) return null;
  const current = view.current ? show(resolve(step, view.current)) : null;
  const focus = view.focus ? show(resolve(step, view.focus)) : null;
  const labels = view.labels ? resolve(step, view.labels) : undefined;
  const S = 300, at = (k: string) => g.nodes.find((n) => n.key === k)!;
  return (
    <svg className="viz-graph" viewBox={`0 0 ${S} ${S}`} width={S} height={S} role="img" aria-label="Graph">
      <defs><marker id="viz-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" /></marker></defs>
      {g.edges.map((e, i) => {
        const a = at(e.from), b = at(e.to);
        const dx = (b.x - a.x) * S, dy = (b.y - a.y) * S, len = Math.hypot(dx, dy) || 1;
        const x1 = a.x * S + (dx / len) * 20, y1 = a.y * S + (dy / len) * 20, x2 = b.x * S - (dx / len) * 22, y2 = b.y * S - (dy / len) * 22;
        const hot = e.from === current && e.to === focus;
        return <g key={i} className={"ge" + (hot ? " hot" : "")}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={view.directed ? "url(#viz-arrow)" : undefined} />
          {e.weight && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle">{e.weight}</text>}
        </g>;
      })}
      {g.nodes.map((n) => {
        const label = labels !== undefined ? nodeLabel(labels, n.key, step) : null;
        return <g key={n.key} className={"gn" + (n.key === current ? " now" : n.key === focus ? " focus" : label !== null ? " seen" : "")} transform={`translate(${n.x * S},${n.y * S})`}>
          <circle r={18} />
          <text dy="0.35em" textAnchor="middle">{n.label.length > 7 ? n.label.slice(0, 6) + "…" : n.label}</text>
          {label !== null && <text className="gl" dy="2.4em" textAnchor="middle">{label}</text>}
        </g>;
      })}
    </svg>
  );
}

function TableView({ view, step, grid, before }: { view: View; step: Step; grid: Raw; before: Raw }) {
  const rows = items(grid);
  if (!rows) return null;
  const old = items(before);
  const [ri, ci] = view.cell ? [asIndex(resolve(step, view.cell[0])), asIndex(resolve(step, view.cell[1]))] : [null, null];
  const rowHead = view.rows ? ["", ...(items(resolve(step, view.rows)) ?? [])] : null;
  const colHead = view.cols ? ["", ...(items(resolve(step, view.cols)) ?? [])] : null;
  return (
    <table className="viz-table">
      {colHead && <thead><tr><th />{colHead.map((h, j) => <th key={j} className={j === ci ? "on" : ""}>{show(h, step)}</th>)}</tr></thead>}
      <tbody>{rows.map((r, i) => {
        const cells = items(r) ?? [r];
        const oldRow = old ? items(old[i]) : null;
        return <tr key={i}>
          {rowHead && <th className={i === ri ? "on" : ""}>{show(rowHead[i], step)}</th>}
          {cells.map((x, j) => <td key={j} className={(i === ri && j === ci ? "now" : "") + (oldRow && !same(oldRow[j], x) ? " changed" : "")}>{cell(x, step)}</td>)}
        </tr>;
      })}</tbody>
    </table>
  );
}
