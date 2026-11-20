"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Square, RotateCcw, Eraser, FileCode2, ChevronDown, CircleCheck, CircleX } from "lucide-react";
import { CodeEditor, type RuntimeError } from "../../components/CodeEditor";
import { Runner } from "../../workers/runner";
import { read, save } from "../../features/progress/store";
import { t } from "../../i18n";

const STORE_FILE = "scratch.py"; // storage key kept for existing saved code
const SPLIT_KEY = "swarmladderlab.split";
const EXAMPLES: { label: string; code: string }[] = [
  { label: "Hello", code: 'name = "Ada"\nprint(f"Hello, {name}!")\n' },
  { label: "Loops", code: "total = 0\nfor n in range(1, 101):\n    total += n\nprint(total)\n" },
  { label: "Lists", code: "squares = [n * n for n in range(10)]\nprint(squares)\nprint(sum(squares))\n" },
  { label: "Dictionaries", code: 'stock = {"apples": 3, "pears": 0, "plums": 7}\nfor fruit, count in stock.items():\n    status = "in stock" if count else "sold out"\n    print(f"{fruit:<8} {status}")\n' },
  { label: "Functions", code: 'def greet(name, punctuation="!"):\n    return f"Welcome, {name}{punctuation}"\n\nprint(greet("Grace"))\nprint(greet("Linus", "?"))\n' },
  { label: "Classes", code: 'from dataclasses import dataclass\n\n@dataclass\nclass Rung:\n    number: int\n    title: str\n\n    def label(self):\n        return f"{self.number:02} — {self.title}"\n\nprint(Rung(6, "Loops").label())\n' },
  { label: "Errors", code: 'def average(values):\n    return sum(values) / len(values)\n\nprint(average([3, 4, 5]))\nprint(average([]))\n' },
];
type Line = { name: string; text: string };
type Meta = { ok: boolean; ms: number } | null;

export default function Playground() {
  const [source, setSource] = useState(""),
    [status, setStatus] = useState(t("runtime.loading")),
    [busy, setBusy] = useState(false),
    [output, setOutput] = useState<Line[]>([]),
    [meta, setMeta] = useState<Meta>(null),
    [error, setError] = useState<RuntimeError>(null),
    [cursor, setCursor] = useState({ line: 1, col: 1 }),
    [problems, setProblems] = useState(0),
    [split, setSplit] = useState(60),
    [menu, setMenu] = useState(false);
  const active = useRef(false),
    runner = useRef<Runner | null>(null),
    body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSource(read().code?.playground?.[STORE_FILE] ?? EXAMPLES[0].code);
    const saved = Number(localStorage.getItem(SPLIT_KEY));
    if (saved >= 25 && saved <= 80) setSplit(saved);
    runner.current = new Runner((s) => setStatus(s === "Python ready" ? t("runtime.ready") : s));
    return () => {
      runner.current?.dispose();
      runner.current = null;
    };
  }, []);

  function edit(v: string) {
    setSource(v);
    if (error) setError(null);
    save("playground", STORE_FILE, v);
  }
  async function run() {
    const session = runner.current;
    if (!session || active.current) return;
    active.current = true;
    setBusy(true);
    setOutput([]);
    setMeta(null);
    setError(null);
    const start = performance.now();
    const result = await session.run(source, "/course", (name, text) => {
      if (runner.current === session) setOutput((v) => [...v, { name, text }]);
    });
    if (runner.current !== session) return;
    if (result.error) {
      setOutput((v) => [...v, { name: "stderr", text: result.friendly ?? result.error ?? "" }]);
      if (result.line) setError({ line: result.line, message: result.error.trim().split("\n").pop() ?? "" });
    }
    setMeta({ ok: !result.error, ms: Math.round(performance.now() - start) });
    active.current = false;
    setBusy(false);
  }
  function restart(stop: boolean) {
    runner.current?.dispose();
    runner.current = new Runner((s) => setStatus(s === "Python ready" ? t("runtime.ready") : s));
    setStatus(t("runtime.loading"));
    setBusy(false);
    active.current = false;
    setMeta(null);
    setOutput(stop ? [{ name: "stderr", text: t("play.stopped") }] : []);
  }
  // Drag the divider to give the editor or the console more room.
  function startDrag(e: React.PointerEvent) {
    const box = body.current?.getBoundingClientRect();
    if (!box) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const pct = Math.min(80, Math.max(25, ((ev.clientX - box.left) / box.width) * 100));
      setSplit(pct);
      localStorage.setItem(SPLIT_KEY, String(Math.round(pct)));
    };
    const up = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
  }

  const ready = status === t("runtime.ready");
  return (
    <div className="ide">
      <h1 className="sr-only">{t("play.title")}</h1>
      <div className="ide-bar">
        <div className="ide-tabs" role="tablist">
          <span className="ide-tab" role="tab" aria-selected="true">
            <FileCode2 size={14} /> main.py
          </span>
        </div>
        <div className="ide-actions">
          <div className="ide-menu">
            <button className="ide-btn" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              {t("play.examples")} <ChevronDown size={14} />
            </button>
            {menu && (
              <ul className="ide-menu-list" role="menu">
                {EXAMPLES.map((x) => (
                  <li key={x.label}>
                    <button role="menuitem" onClick={() => { edit(x.code); setMenu(false); }}>{x.label}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="ide-btn icon" disabled={!busy} onClick={() => restart(true)} aria-label={t("lesson.stop")} title={t("lesson.stop")}>
            <Square size={14} />
          </button>
          <button className="ide-btn icon" onClick={() => restart(false)} aria-label={t("lesson.restart")} title={t("lesson.restart")}>
            <RotateCcw size={14} />
          </button>
          <button className="button run-button small" disabled={busy || !ready} onClick={run} title="Shift + Enter">
            <Play size={14} fill="currentColor" /> {busy ? t("lesson.running") : t("lesson.run")}
          </button>
        </div>
      </div>

      <div className="ide-body" ref={body} style={{ ["--split" as string]: split + "%" }}>
        <section className="ide-editor" aria-label="main.py">
          <CodeEditor value={source} onChange={edit} onRun={run} runner={runner} error={error} fill onCursor={(line, col) => setCursor({ line, col })} onProblems={setProblems} />
        </section>
        <div className="ide-divider" role="separator" aria-orientation="vertical" aria-valuenow={Math.round(split)} onPointerDown={startDrag} />
        <section className="console-pane">
          <div className="pane-head">
            <h2>{t("play.console")}</h2>
            {meta && (
              <span className={"run-meta " + (meta.ok ? "ok" : "no")}>
                {meta.ok ? <CircleCheck size={13} /> : <CircleX size={13} />} {meta.ok ? t("play.exitOk") : t("play.exitError")} · {meta.ms} ms
              </span>
            )}
            <button className="ide-btn icon" onClick={() => { setOutput([]); setMeta(null); }} aria-label={t("play.clear")} title={t("play.clear")}>
              <Eraser size={14} />
            </button>
          </div>
          <pre className="output" aria-live="polite">
            {output.length
              ? output.map((o, i) => <span key={i} className={o.name === "stderr" ? "stderr" : undefined}>{o.text}</span>)
              : <span className="output-hint">{busy ? t("lesson.running") : t("play.empty")}</span>}
          </pre>
          {error && (
            <p className="console-jump">
              {t("play.errorAt", { line: error.line })}
            </p>
          )}
        </section>
      </div>

      <footer className="ide-status">
        <span className={"runtime" + (ready ? " ready" : "")} role="status">
          <span className="runtime-dot" aria-hidden /> {status}
        </span>
        <span className={problems ? "problems has" : "problems"}>{problems ? t(problems === 1 ? "play.problems" : "play.problemsMany", { n: problems }) : t("play.noProblems")}</span>
        <span className="ide-status-right">
          <span>{t("play.cursor", { line: cursor.line, col: cursor.col })}</span>
          <span>Python 3.13</span>
          <span>{t("play.spaces")}</span>
          <span className="ide-keys"><kbd>⇧</kbd><kbd>↵</kbd> {t("play.toRun")}</span>
        </span>
      </footer>
    </div>
  );
}
