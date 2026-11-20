"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Square, RotateCcw, Terminal, FileCode2 } from "lucide-react";
import { CodeEditor } from "../../components/CodeEditor";
import { Runner } from "../../workers/runner";
import { read, save } from "../../features/progress/store";
import { t } from "../../i18n";

const filename = "scratch.py";
export default function Playground() {
  const [source, setSource] = useState(""),
    [status, setStatus] = useState(t("runtime.loading")),
    [busy, setBusy] = useState(false),
    [output, setOutput] = useState(""),
    [ran, setRan] = useState(false);
  const active = useRef(false),
    runner = useRef<Runner | null>(null);
  useEffect(() => {
    setSource(read().code?.playground?.[filename] ?? 'print("Hello, Python!")');
    runner.current = new Runner(setStatus);
    return () => {
      runner.current?.dispose();
      runner.current = null;
    };
  }, []);
  async function run() {
    const session = runner.current;
    if (!session || active.current) return;
    active.current = true;
    setBusy(true);
    setRan(true);
    setOutput("");
    const result = await session.run(source, "/course", (_name, text) => {
      if (runner.current === session) setOutput((v) => v + text);
    });
    if (runner.current !== session) return;
    if (result.error) setOutput((v) => v + (result.friendly ?? result.error));
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
    setOutput(stop ? t("play.stopped") : "");
  }
  const ready = /ready/i.test(status);
  return (
    <div className="shell page-pad">
      <header className="page-head">
        <p className="eyebrow">Python</p>
        <h1 className="display small">{t("play.title")}</h1>
        <p className="lede">{t("play.lede")}</p>
      </header>
      <div className="studio">
        <div className="studio-command">
          <span className={"runtime" + (ready ? " ready" : "")} role="status">
            <span className="runtime-dot" aria-hidden /> {status}
          </span>
          <div>
            <button className="button primary small" disabled={busy} onClick={run}>
              <Play size={15} /> {t("lesson.run")}
            </button>
            <button className="button quiet small" disabled={!busy} onClick={() => restart(true)}>
              <Square size={15} /> {t("lesson.stop")}
            </button>
            <button className="button quiet small" onClick={() => restart(false)}>
              <RotateCcw size={15} /> {t("lesson.restart")}
            </button>
          </div>
        </div>
        <div className="studio-split">
          <section className="scratch-pane">
            <h2 className="pane-head">
              <FileCode2 size={15} /> {filename}
            </h2>
            <CodeEditor
              value={source}
              onChange={(v) => {
                setSource(v);
                save("playground", filename, v);
              }}
              onRun={run}
            />
            <div className="editor-foot">
              <kbd>Shift</kbd> + <kbd>Enter</kbd> {t("play.toRun")}
            </div>
          </section>
          <section className="console-pane">
            <h2 className="pane-head">
              <Terminal size={15} /> {t("play.console")}
            </h2>
            <pre className="output" aria-live="polite">
              {output || (busy ? t("lesson.running") : ran ? t("lesson.noOutput") : t("play.empty"))}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
