"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Square, RotateCcw, Eraser, FileCode2 } from "lucide-react";
import { CodeEditor } from "../../components/CodeEditor";
import { Runner } from "../../workers/runner";
import { read, save } from "../../features/progress/store";
import { t } from "../../i18n";

const filename = "scratch.py";
// Starter pages: one click loads a small, runnable idea.
const SNIPPETS: { label: string; code: string }[] = [
  { label: "Hello", code: 'name = "Ada"\nprint(f"Hello, {name}!")' },
  { label: "Loops", code: "total = 0\nfor n in range(1, 101):\n    total += n\nprint(total)" },
  { label: "Lists", code: "squares = [n * n for n in range(10)]\nprint(squares)\nprint(sum(squares))" },
  { label: "Dictionaries", code: 'stock = {"apples": 3, "pears": 0, "plums": 7}\nfor fruit, count in stock.items():\n    status = "in stock" if count else "sold out"\n    print(f"{fruit:<8} {status}")' },
  { label: "Functions", code: 'def greet(name, punctuation="!"):\n    return f"Welcome, {name}{punctuation}"\n\nprint(greet("Grace"))\nprint(greet("Linus", "?"))' },
  { label: "Classes", code: 'from dataclasses import dataclass\n\n@dataclass\nclass Rung:\n    number: int\n    title: str\n\n    def label(self):\n        return f"{self.number:02} — {self.title}"\n\nprint(Rung(6, "Loops").label())' },
];

type Meta = { ok: boolean; ms: number } | null;

export default function Playground() {
  const [source, setSource] = useState(""),
    [status, setStatus] = useState(t("runtime.loading")),
    [busy, setBusy] = useState(false),
    [output, setOutput] = useState<{ name: string; text: string }[]>([]),
    [meta, setMeta] = useState<Meta>(null),
    [ran, setRan] = useState(false);
  const active = useRef(false),
    runner = useRef<Runner | null>(null);
  useEffect(() => {
    setSource(read().code?.playground?.[filename] ?? SNIPPETS[0].code);
    runner.current = new Runner(setStatus);
    return () => {
      runner.current?.dispose();
      runner.current = null;
    };
  }, []);
  function edit(v: string) {
    setSource(v);
    save("playground", filename, v);
  }
  async function run() {
    const session = runner.current;
    if (!session || active.current) return;
    active.current = true;
    setBusy(true);
    setRan(true);
    setOutput([]);
    setMeta(null);
    const start = performance.now();
    const result = await session.run(source, "/course", (name, text) => {
      if (runner.current === session) setOutput((v) => [...v, { name, text }]);
    });
    if (runner.current !== session) return;
    if (result.error) setOutput((v) => [...v, { name: "stderr", text: result.friendly ?? result.error ?? "" }]);
    setMeta({ ok: !result.error, ms: Math.round(performance.now() - start) });
    active.current = false;
    setBusy(false);
  }
  function restart(stop: boolean) {
    runner.current?.dispose();
    runner.current = new Runner(setStatus);
    setStatus(t("runtime.loading"));
    setBusy(false);
    active.current = false;
    setRan(stop);
    setMeta(null);
    setOutput(stop ? [{ name: "stderr", text: t("play.stopped") }] : []);
  }
  const ready = /ready/i.test(status);
  const lines = source.split("\n").length;
  return (
    <div className="shell page-pad play">
      <header className="play-head">
        <div>
          <p className="eyebrow">{t("play.eyebrow")}</p>
          <h1 className="display small">{t("play.title")}</h1>
          <p className="lede">{t("play.lede")}</p>
        </div>
        <div className="snippets" role="group" aria-label={t("play.starters")}>
          <span className="snippets-label">{t("play.starters")}</span>
          {SNIPPETS.map((s) => (
            <button key={s.label} type="button" className="chip" onClick={() => edit(s.code)}>
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <div className="studio">
        <div className="studio-command">
          <div className="studio-tabs">
            <span className="studio-tab">
              <FileCode2 size={14} /> {filename}
            </span>
          </div>
          <div className="studio-actions">
            <button className="button run-button small" disabled={busy} onClick={run}>
              <Play size={14} fill="currentColor" /> {t("lesson.run")}
            </button>
            <button className="studio-icon" disabled={!busy} onClick={() => restart(true)} aria-label={t("lesson.stop")} title={t("lesson.stop")}>
              <Square size={15} />
            </button>
            <button className="studio-icon" onClick={() => restart(false)} aria-label={t("lesson.restart")} title={t("lesson.restart")}>
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
        <div className="studio-split">
          <section className="scratch-pane" aria-label={filename}>
            <CodeEditor value={source} onChange={edit} onRun={run} />
          </section>
          <section className="console-pane">
            <div className="pane-head">
              <h2>{t("play.console")}</h2>
              {meta && (
                <span className={"run-meta " + (meta.ok ? "ok" : "no")}>
                  {meta.ok ? t("play.exitOk") : t("play.exitError")} · {meta.ms} ms
                </span>
              )}
              <button className="studio-icon" onClick={() => { setOutput([]); setMeta(null); setRan(false); }} aria-label={t("play.clear")} title={t("play.clear")}>
                <Eraser size={14} />
              </button>
            </div>
            <pre className="output" aria-live="polite">
              {output.length
                ? output.map((o, i) => <span key={i} className={o.name === "stderr" ? "stderr" : undefined}>{o.text}</span>)
                : <span className="output-hint">{busy ? t("lesson.running") : ran ? t("lesson.noOutput") : t("play.empty")}</span>}
            </pre>
          </section>
        </div>
        <footer className="studio-status">
          <span className={"runtime" + (ready ? " ready" : "")} role="status">
            <span className="runtime-dot" aria-hidden /> {status}
          </span>
          <span>{t("play.lines", { n: lines })}</span>
          <span>{t("play.saved")}</span>
          <span className="studio-keys"><kbd>Shift</kbd> + <kbd>Enter</kbd> {t("play.toRun")}</span>
        </footer>
      </div>
    </div>
  );
}
