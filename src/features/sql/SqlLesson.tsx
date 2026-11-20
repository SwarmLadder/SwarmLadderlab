"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Play, RotateCcw, Square } from "lucide-react";
import { CodeEditor } from "../../components/CodeEditor";
import { lessonPath, type Catalog } from "../../lib/course";
import { route } from "../../lib/journey";
import { sqlProgram, type SqlGrade, type SqlMode } from "../../lib/sqlRuntime";
import { doneIn, finish, isFinished, mark, onProgress, read, save, setLast } from "../progress/store";
import { Runner } from "../../workers/runner";

type SqlPage = {
  id: string;
  title: string;
  guideHtml: string;
  source: string;
  sourcePath: string;
  dialect: "sqlite" | "postgresql";
  runnable: boolean;
  grade: SqlGrade | null;
  schemaTask?: string | null;
  graded: string[];
  hint: string;
};
const SQL_REPO = "https://github.com/SwarmLadder/SQL";

export function SqlLesson({ id, catalog }: { id: string; catalog: Catalog }) {
  const [lesson, setLesson] = useState<SqlPage>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const filename = encodeURIComponent(id.replaceAll("/", "__")) + ".json";
    fetch("/data/sql/nb/" + filename, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error("Could not load SQL lesson");
        return r.json() as Promise<SqlPage>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setLast(id);
          setLesson(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(String(err));
      });
    return () => controller.abort();
  }, [id]);

  if (lesson) return <Workspace lesson={lesson} catalog={catalog} />;
  return (
    <div className="shell page-pad" role="status">
      {error ? "Unable to load SQL lesson. " : "Loading SQL lesson… "}
      {error && <Link href="/learn/sql">Return to SQL course</Link>}
    </div>
  );
}

function Workspace({ lesson, catalog }: { lesson: SqlPage; catalog: Catalog }) {
  const [value, setValue] = useState(() => read().code?.[lesson.id]?.sql ?? lesson.source);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState(lesson.runnable ? "Starting SQLite…" : "PostgreSQL reference");
  const [busy, setBusy] = useState<SqlMode | null>(null);
  const [complete, setComplete] = useState(() =>
    (lesson.grade || lesson.schemaTask) ? doneIn(lesson.id).includes("challenge") : isFinished(lesson.id));
  const runner = useRef<Runner | null>(null);
  const running = useRef(false);

  const isChallenge = !!(lesson.grade || lesson.schemaTask);
  const qid = lesson.id.split("/").at(-1) ?? "";

  // Use exactly the same progress store as the existing Python course, while
  // keeping distinct SQL-prefixed IDs to avoid collisions with Python lessons.
  useEffect(() => onProgress(() =>
    setComplete((lesson.grade || lesson.schemaTask) ? doneIn(lesson.id).includes("challenge") : isFinished(lesson.id))
  ), [lesson.id, lesson.grade]);

  useEffect(() => {
    document.title = lesson.title + " · SwarmLadder Lab";
    if (lesson.runnable) {
      const session = new Runner((message) =>
        setStatus(message === "Python ready" || message === "" ? "SQLite ready" : message));
      runner.current = session;
    }
    return () => {
      runner.current?.dispose();
      runner.current = null;
      document.title = "SwarmLadder Lab";
    };
  }, [lesson.id, lesson.runnable, lesson.title]);

  const currentRoute = useMemo(() => route(catalog), [catalog, complete]);
  const index = currentRoute.all.findIndex((stop) => stop.item.id === lesson.id);
  const here = currentRoute.all[index];
  const prev = index > 0 ? currentRoute.all[index - 1] : null;
  const next = index >= 0 ? currentRoute.all[index + 1] ?? null : null;

  function edit(text: string) {
    setValue(text);
    save(lesson.id, "sql", text);
  }

  function restart(clearOutput: boolean) {
    runner.current?.dispose();
    if (lesson.runnable) {
      runner.current = new Runner((message) =>
        setStatus(message === "Python ready" || message === "" ? "SQLite ready" : message));
      setStatus("Starting SQLite…");
    }
    running.current = false;
    setBusy(null);
    setOutput(clearOutput ? "" : "Execution stopped. SQLite session restarted.");
  }

  async function execute(mode: SqlMode) {
    const session = runner.current;
    if (!session || running.current || !lesson.runnable || (mode === "grade" && !isChallenge)) return;
    running.current = true;
    setBusy(mode);
    setOutput("");
    let transcript = "";
    try {
      const result = await session.run(
        sqlProgram(value, mode, lesson.grade ?? undefined, qid, lesson.schemaTask ?? ""),
        "/course/sql",
        (name, chunk) => {
          if (runner.current !== session) return;
          transcript += chunk;
          setOutput((old) => old + chunk);
        },
      );
      if (runner.current !== session) return;
      if (result.error) {
        setOutput((old) => old + (old ? "\n" : "") + (result.friendly || result.error));
      } else if (mode === "grade" &&
                 transcript.includes("✅ SQL challenge " + qid + ": passed")) {
        mark(lesson.id, ["challenge"]);
        setComplete(true);
      }
    } finally {
      if (runner.current === session) {
        running.current = false;
        setBusy(null);
      }
    }
  }

  function finishReading() {
    if (!isChallenge) {
      finish(lesson.id);
      setComplete(true);
    }
  }

  return (
    <div className="lesson sql-lesson">
      <div className="lesson-bar" role="region" aria-label="SQL lesson tools">
        <div className="lesson-bar-row">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/learn/sql">SQL</Link>
            <span aria-hidden="true">/</span>
            <span>{here?.level.title ?? "Course"}</span>
          </nav>
          <span className="runtime" role="status">
            <span className="runtime-dot" aria-hidden="true" />
            {status}
          </span>
          <div className="lesson-bar-actions">
            {lesson.runnable && (
              <>
                <button className="button quiet small" onClick={() => restart(false)} aria-label="Stop SQL">
                  <Square size={13} /> Stop
                </button>
                <button className="button quiet small" onClick={() => restart(true)} aria-label="Restart SQL">
                  <RotateCcw size={14} /> Restart
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <header className="lesson-head">
        <div className="shell lesson-head-grid">
          <div>
            <p className="eyebrow">{here?.level.title ?? "SQL"} · {lesson.dialect === "postgresql" ? "PostgreSQL 16+" : "SQLite in your browser"}</p>
            <h1 className="lesson-title">{lesson.title}</h1>
            <p className="lesson-meta">
              <span className={"meta-chip" + (complete ? " complete" : "")}>
                {complete ? "✓ Completed" : isChallenge ? "Graded challenge" : "Guided practice"}
              </span>
              <span className="meta-links">
                Source: <a href={SQL_REPO + "/blob/main/" + lesson.sourcePath}>GitHub</a>
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="lesson-layout shell">
        <aside className="step-rail" aria-label="SQL lesson navigation">
          <p className="eyebrow">Your learning path</p>
          <ol>
            <li className={complete ? "done" : "current"}>
              <Link href="/learn/sql">
                <span className="step-rail-node" aria-hidden="true">{complete ? <Check size={12} /> : "1"}</span>
                <span className="step-rail-title">SQL course</span>
              </Link>
            </li>
          </ol>
          <p className="sql-aside-note">Run queries on fictional data. Your edits and progress stay in this browser.</p>
        </aside>

        <div className="steps">
          <section className="step" aria-labelledby="sql-guide">
            <header className="step-head">
              <p className="eyebrow">Learn · Practice · Apply</p>
              <h2 id="sql-guide">Lesson guide</h2>
            </header>
            <div className="prose" dangerouslySetInnerHTML={{ __html: lesson.guideHtml }} />
            {lesson.hint && (
              <details className="sql-hint">
                <summary>Show a hint</summary>
                <p>{lesson.hint}</p>
              </details>
            )}

            <div className={"code-cell kind-code" + (complete ? " solved" : "")}>
              <div className="cell-tools">
                <span className="cell-label">
                  {lesson.runnable ? "SQL editor" : "PostgreSQL reference script"}
                  {complete && <span className="cell-solved"><Check size={13} /> Completed</span>}
                </span>
                {lesson.runnable && (
                  <span className="cell-buttons">
                    <button className="button quiet small" disabled={!!busy}
                      onClick={() => edit(lesson.source)}>Reset code</button>
                    <button className="button small run cell-run" disabled={!!busy} onClick={() => execute("run")}>
                      <Play size={13} /> Run SQL
                    </button>
                    {isChallenge && (
                      <button className="button small run cell-run" disabled={!!busy} onClick={() => execute("grade")}>
                        <Check size={13} /> Check answer
                      </button>
                    )}
                  </span>
                )}
              </div>
              {lesson.runnable ? (
                <CodeEditor language="sql" value={value} onChange={edit} onRun={() => execute("run")} />
              ) : (
                <pre className="sql-reference"><code>{lesson.source}</code></pre>
              )}
              {lesson.runnable && (
                <p className="sql-execution-note">
                  Every run starts from a fresh in-memory sample database. No SQL is sent to a server.
                  {isChallenge && " Check answer uses two fixtures and requires one read-only query."}
                </p>
              )}
              {lesson.runnable && (output || busy) && (
                <div className="output-wrap">
                  <span className="output-label">SQL output</span>
                  <pre className="output" aria-live="polite" aria-label="SQL output">
                    {output || (busy ? "Running…" : "No results")}
                  </pre>
                </div>
              )}
            </div>

            <div className="step-continue">
              {!isChallenge && (
                <button className="button primary" disabled={complete} onClick={finishReading}>
                  {complete ? <><Check size={17} /> Lesson completed</> : <>Mark lesson complete <Check size={17} /></>}
                </button>
              )}
              {isChallenge && !complete && <p>Submit a correct answer to complete this challenge.</p>}
              {isChallenge && complete && <p>{lesson.schemaTask ? "✅ Schema behavior verified." : "✅ Passed on the base and edge datasets."}</p>}
              {next && <Link className="button quiet" href={lessonPath(next.item.id)}>Next activity <ArrowRight size={17} /></Link>}
            </div>
          </section>

          <nav className="pager" aria-label="SQL lessons">
            {prev ? (
              <Link href={lessonPath(prev.item.id)}>
                <ArrowLeft size={16} /> <span><small>Previous</small>{prev.item.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link className="pager-next" href={lessonPath(next.item.id)}>
                <span><small>Next lesson</small>{next.item.title}</span> <ArrowRight size={16} />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
