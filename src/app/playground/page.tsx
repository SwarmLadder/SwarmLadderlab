"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Square, RotateCcw, Terminal, FileCode2 } from "lucide-react";
import { CodeEditor } from "../../components/CodeEditor";
import { Runner } from "../../workers/runner";
import { read, save } from "../../features/progress/store";

const filename = "scratch.py";
export default function Playground() {
  const [source, setSource] = useState(""),
    [status, setStatus] = useState("Loading Python…"),
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
    const result = await session.run(source, "/course", (name, text) => {
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
    setStatus("Loading Python…");
    setBusy(false);
    active.current = false;
    setRan(stop);
    setOutput(stop ? "Stopped." : "");
  }
  return (
    <div className="playground-page">
      <p className="page-context">
        <Terminal size={17} /> Python workspace
      </p>
      <h1>Playground</h1>
      <p className="play-intro">
        Experiment with Python in your browser. Your scratch file is saved as
        you type.
      </p>
      <div className="studio">
        <div className="studio-command">
          <span className="runtime-state" role="status">
            {status}
          </span>
          <div>
            <button className="run" disabled={busy} onClick={run}>
              <Play /> Run
            </button>
            <button disabled={!busy} onClick={() => restart(true)}>
              <Square /> Stop
            </button>
            <button onClick={() => restart(false)}>
              <RotateCcw /> Restart
            </button>
          </div>
        </div>
        <div className="studio-split">
          <section className="scratch-pane">
            <h2>
              <FileCode2 /> {filename}
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
              <kbd>Shift + Enter</kbd> to run
            </div>
          </section>
          <section className="console-pane">
            <h2>
              <Terminal /> Console
            </h2>
            <pre className="output" aria-live="polite">
              {output ||
                (busy
                  ? "Running…"
                  : ran
                    ? "Finished without output."
                    : "Run your code to see output here.")}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
