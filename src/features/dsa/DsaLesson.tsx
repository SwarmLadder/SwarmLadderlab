"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Play, RotateCcw, Square } from "lucide-react";
import Prism from "../../lib/prism";
import { CodeEditor } from "../../components/CodeEditor";
import { lessonPath, type Catalog } from "../../lib/course";
import { route } from "../../lib/journey";
import { Runner } from "../../workers/runner";
import { DSA_RESULT_PREFIX, dsaPythonScript, parseDsaResults, type DsaCase, type DsaCaseResult } from "../../lib/dsaRunner";
import { doneIn, finish, isFinished, mark, onProgress, read, save, setLast } from "../progress/store";

type DsaPage = {
  id: string; title: string; sourcePath: string; guideHtml: string; source: string;
  mode: "browser-dsa" | "reading-dsa"; graded: string[];
  problemId?: string; difficulty?: string; pattern?: string; prompt?: string;
  constraints?: string; signature?: string; hints?: string[]; cases?: DsaCase[];
  shortExplanation?: string;
};
const UPSTREAM = "https://github.com/SwarmLadder/Data-Structures-Algorithms";

export function DsaLesson({ id, catalog }: { id: string; catalog: Catalog }) {
  const [page, setPage] = useState<DsaPage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const ctl = new AbortController();
    setPage(null); setError("");
    fetch("/data/dsa/nb/" + encodeURIComponent(id.replaceAll("/", "__")) + ".json", { signal: ctl.signal })
      .then((response) => {
        if (!response.ok) throw Error("Unable to load this DSA activity");
        return response.json() as Promise<DsaPage>;
      }).then((value) => { if (!ctl.signal.aborted) { setLast(value.id); setPage(value); } })
      .catch((reason) => { if (!ctl.signal.aborted) setError(String(reason)); });
    return () => ctl.abort();
  }, [id]);
  if (!page) return <p className="page-loading" role="status">{error || "Loading DSA activity…"}{" "}
    {error && <Link href="/learn/dsa">Return to DSA</Link>}</p>;
  return <Workspace key={page.id} page={page} catalog={catalog} />;
}

function Workspace({ page, catalog }: { page: DsaPage; catalog: Catalog }) {
  const problem = page.mode === "browser-dsa" && Boolean(page.cases?.length);
  const [draft, setDraft] = useState(() => read().code?.[page.id]?.draft ?? page.source);
  const [complete, setComplete] = useState(() =>
    problem ? doneIn(page.id).includes("case-suite") : isFinished(page.id));
  const [status, setStatus] = useState("Starting Python…");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DsaCaseResult[] | null>(null);
  const [checkedCases, setCheckedCases] = useState<DsaCase[]>([]);
  const [consoleOut, setConsoleOut] = useState("");
  const [notice, setNotice] = useState("");
  const [runtimeVersion, setRuntimeVersion] = useState(0);
  const runner = useRef<Runner | null>(null);
  const guide = useRef<HTMLDivElement>(null);
  const r = useMemo(() => route(catalog), [catalog, complete]);
  const index = r.all.findIndex((x) => x.item.id === page.id);
  const previous = index > 0 ? r.all[index - 1] : null;
  const next = index >= 0 ? r.all[index + 1] ?? null : null;
  const level = index >= 0 ? r.all[index].level.title : "DSA";

  useEffect(() => onProgress(() => setComplete(
    problem ? doneIn(page.id).includes("case-suite") : isFinished(page.id),
  )), [page.id, problem]);
  useEffect(() => {
    document.title = page.title + " · SwarmLadder Lab";
    return () => { document.title = "SwarmLadder Lab"; };
  }, [page.title]);
  useEffect(() => {
    if (!problem) return;
    const session = new Runner(setStatus);
    runner.current = session;
    return () => {
      session.dispose();
      if (runner.current === session) runner.current = null;
    };
  }, [problem, runtimeVersion]);
  useEffect(() => {
    guide.current?.querySelectorAll<HTMLElement>("pre code").forEach((block) => {
      if (block.className.includes("language-")) Prism.highlightElement(block);
    });
  }, [page.id]);

  function edit(value: string) {
    setDraft(value);
    save(page.id, "draft", value);
    setResults(null);
    setCheckedCases([]);
    setNotice("Draft saved. Rerun the cases to check changes.");
  }
  function restart() {
    runner.current?.dispose();
    runner.current = null;
    setRuntimeVersion((n) => n + 1);
    setRunning(false); setResults(null); setCheckedCases([]); setConsoleOut("");
    setStatus("Restarting Python…");
    setNotice("Python runtime restarted; previous results cleared.");
  }
  async function runChecks(mode: "sample" | "all" = "all") {
    if (running || !problem || !page.cases?.length || !runner.current) return;
    const selectedCases = mode === "sample" ? page.cases.slice(0, 2) : page.cases;
    const session = runner.current;
    setRunning(true); setResults(null); setCheckedCases(selectedCases); setConsoleOut(""); setNotice("");
    let collected = "";
    const timeout = setTimeout(() => {
      if (runner.current === session) {
        session.dispose();
        runner.current = null;
        setRuntimeVersion((n) => n + 1);
        setNotice("Run stopped after 90 seconds. Check for an infinite loop.");
        setRunning(false);
      }
    }, 90_000);
    try {
      const response = await session.run(dsaPythonScript(draft, selectedCases), "/course/dsa",
        (name, output) => {
          collected += output;
          if (name === "stderr") setConsoleOut((s) => s + output);
        });
      if (runner.current !== session) return;
      if (response.error) throw Error(response.friendly || response.error);
      const checked = parseDsaResults(collected, selectedCases.length);
      setResults(checked);
      const count = checked.filter((test) => test.ok).length;
      if (mode === "all" && count === selectedCases.length) {
        mark(page.id, ["case-suite"]);
        setComplete(true);
        setNotice("Passed all " + count + " published cases! Progress saved locally.");
      } else if (mode === "sample" && count === selectedCases.length) {
        setNotice("Both sample cases passed. Run all six published cases to earn completion.");
      } else {
        setNotice("Passed " + count + " of " + selectedCases.length + " " + (mode === "sample" ? "sample" : "published") + " cases. Inspect failures and retry.");
      }
      const marker = collected.lastIndexOf(DSA_RESULT_PREFIX);
      setConsoleOut(marker >= 0 ? collected.slice(0, marker).trim().slice(-3000) : "");
    } catch (error) {
      if (runner.current === session) setNotice(String(error));
    } finally {
      clearTimeout(timeout);
      if (runner.current === session) setRunning(false);
    }
  }

  const tests = page.cases ?? [];
  const passed = results?.filter((x) => x.ok).length ?? 0;
  const format = (value: unknown) => JSON.stringify(value) ?? String(value);

  return <div className="lesson native-lesson dsa-lesson">
    <div className="lesson-bar" role="region" aria-label="DSA course tools">
      <div className="lesson-bar-row">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/learn/dsa">Data Structures & Algorithms</Link>
          <span aria-hidden="true">/</span><span>{level}</span>
          <Link className="crumb-roadmap" href="/learn/dsa/roadmap">Roadmap</Link>
        </nav>
        <span className="runtime" role="status">
          <span className="runtime-dot" aria-hidden="true"/>
          {problem ? status : "Guided DSA reading"}
        </span>
      </div>
    </div>
    <header className="lesson-head"><div className="shell lesson-head-grid"><div>
      <p className="eyebrow">{level} · {page.pattern ?? "Algorithm reasoning"}{page.difficulty ? " · " + page.difficulty : ""}</p>
      <h1 className="lesson-title">{page.title}</h1>
      <p className="lesson-meta">
        <span className={"meta-chip" + (complete ? " complete" : "")}>
          {complete ? "✓ Completed" : problem ? "6 public cases · browser-graded" : "Guided reading"}
        </span>
        <span className="meta-links">Source:{" "}
          <a href={UPSTREAM + "/blob/main/" + page.sourcePath} target="_blank" rel="noopener noreferrer">GitHub</a>
        </span>
      </p>
    </div></div></header>
    <div className="lesson-layout shell">
      <aside className="step-rail" aria-label="DSA learning path">
        <p className="eyebrow">Your learning path</p>
        <ol><li className={complete ? "done" : "current"}>
          <Link href="/learn/dsa"><span className="step-rail-node" aria-hidden="true">{complete ? <Check size={12}/> : "1"}</span>
            <span className="step-rail-title">DSA curriculum</span></Link>
        </li></ol>
        <p className="native-caution">DSA Python solutions execute in a Pyodide Web Worker.
          Only six published cases per problem are checked. No hidden judging, complexity enforcement, or server verification.</p>
      </aside>
      <div className="steps">
        <section className="step" aria-labelledby="dsa-guide">
          <header className="step-head">
            <p className="eyebrow">{problem ? "Code · Test · Debug · Learn" : "Learn · Trace · Practice"}</p>
            <h2 id="dsa-guide">{problem ? "Coding challenge" : "Activity guide"}</h2>
          </header>
          {!problem && <div ref={guide} className="prose" dangerouslySetInnerHTML={{ __html: page.guideHtml }}/> }
          {problem && <>
            <div className="native-verify">
              <h3>Solve the task first</h3>
              <p className="practice-task-prompt">{page.prompt}</p>
              <p>Implement <code>{page.signature}</code> yourself. Run Python here and compare its output with the expected result.
                Passing them confirms these cases only; explain correctness and complexity too.</p>
              {page.constraints && <p><strong>Constraints:</strong> {page.constraints}</p>}
              <div className="practice-examples" aria-label="Sample inputs and expected outputs">
                <strong>Start with these two examples</strong>
                <ol>{tests.slice(0, 2).map((sample, i) => <li key={i}>
                  <code>Input: {format(sample.args)}</code>
                  <code>Expected: {format(sample.expected)}</code>
                </li>)}</ol>
              </div>
              {page.hints && <details className="sql-hint">
                <summary>Reveal hints (after attempting)</summary>
                <ol>{page.hints.map((hint, i) => <li key={i}>{hint}</li>)}</ol>
              </details>}
            </div>
            <div className="code-cell kind-code native-workspace">
              <div className="cell-tools">
                <span className="cell-label">{page.problemId} · Your Python solution</span>
                <span className="cell-buttons">
                  <button type="button" className="button quiet small" onClick={() => edit(page.source)}>
                    <RotateCcw size={14}/> Reset starter
                  </button>
                  <button type="button" className="button quiet small" onClick={restart}>
                    <Square size={13}/> Stop / restart
                  </button>
                  <button type="button" className="button quiet small" onClick={() => runChecks("sample")} disabled={running}>
                    <Play size={14}/> Try 2 examples
                  </button>
                  <button type="button" className="button primary small" onClick={() => runChecks("all")} disabled={running}>
                    <Play size={14}/> {running ? "Checking…" : "Run code · check " + tests.length + " cases"}
                  </button>
                </span>
              </div>
              <CodeEditor language="python" runner={runner} value={draft} onChange={edit}
                onRun={() => runChecks("all")} label="DSA Python solution"/>
              <p className="native-caution">Draft and passed-case progress stay on this device.
                Python runs in a Web Worker; use Stop / restart if a solution gets stuck.</p>
            </div>
            {results && <section className="dsa-results" aria-label="Published case results">
              <h3>{passed} / {checkedCases.length} {checkedCases.length === 2 ? "sample" : "published"} cases passed</h3>
              <ol>{results.map((result, i) => <li key={i} className={result.ok ? "pass" : "fail"}>
                <strong>{result.ok ? "✓ PASS" : "✗ FAIL"} · Case {i + 1}</strong>
                <div>
                  <p><strong>Input:</strong> <code>{format(checkedCases[i]?.args)}</code></p>
                  <p><strong>Expected:</strong> <code>{format(checkedCases[i]?.expected)}</code></p>
                  <p><strong>Output:</strong> <code>{result.error ?? format(result.actual)}</code></p>
                </div>
              </li>)}</ol>
            </section>}
            {consoleOut && <pre className="dsa-console" aria-label="Python console output">{consoleOut}</pre>}
            {results && page.shortExplanation && <div className="native-verify" aria-label="Short algorithm explanation">
              <h3>Why it works · Quick explanation</h3>
              <p>{page.shortExplanation}</p>
            </div>}
            <details className="practice-reference">
              <summary>Need help? Open the detailed walkthrough and solution</summary>
              <div ref={guide} className="prose" dangerouslySetInnerHTML={{ __html: page.guideHtml }}/>
            </details>
          </>}
          <div className="step-continue native-complete">
            {problem
              ? <span className={"meta-chip" + (complete ? " complete" : "")}>
                  {complete ? "✓ Published case suite passed" : "Run every public case to earn completion"}
                </span>
              : <button type="button" className="button primary" disabled={complete}
                onClick={() => { finish(page.id); setComplete(true); setNotice("Reading completed. Progress saved."); }}>
                {complete ? <><Check size={17}/> Completed</> : <>Mark activity complete <Check size={17}/></>}
              </button>}
            {next && <Link href={lessonPath(next.item.id)} className="button quiet">Next activity <ArrowRight size={17}/></Link>}
          </div>
          <p className="notice" role="status" aria-live="polite">{notice}</p>
        </section>
        <nav className="pager" aria-label="DSA lessons">
          {previous ? <Link href={lessonPath(previous.item.id)}><ArrowLeft size={16}/> {previous.item.title}</Link> : <span/>}
          {next ? <Link href={lessonPath(next.item.id)}>{next.item.title} <ArrowRight size={16}/></Link>
            : <Link href="/learn/dsa">Back to DSA course</Link>}
        </nav>
      </div>
    </div>
  </div>;
}
