"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ListOrdered, Play, RotateCcw, Rows3, Square } from "lucide-react";
import { courseRepo, lessonPath, notebookData, type Catalog, type CodeCell, type Notebook } from "../../lib/course";
import { coursePath } from "../../lib/courses";
import { topic, lessonNumber, route } from "../../lib/journey";
import { doneIn, finish, graduatedKeys, mark, onProgress, reach, reachedIn, read, save, setLast } from "../progress/store";
import { highlightPython } from "../../lib/pythonSyntax";
import { Runner } from "../../workers/runner";
import { LadderMark } from "../../components/Brand";
import { CodeEditor, type RuntimeError } from "../../components/CodeEditor";
import { buildSteps, keysFor, quizFingerprint, type QuizData, type Step } from "./steps";
import { t } from "../../i18n";

type Output = { name: string; text: string };
const VIEW_KEY = "swarmladderlab.view";

export function Lesson({ id, catalog }: { id: string; catalog: Catalog }) {
  const [nb, setNb] = useState<Notebook>();
  const [error, setError] = useState("");
  useEffect(() => {
    const ctl = new AbortController();
    notebookData(id, ctl.signal)
      .then((n) => {
        if (!ctl.signal.aborted) {
          setLast(id);
          setNb(n);
        }
      })
      .catch((e) => !ctl.signal.aborted && setError(String(e)));
    return () => ctl.abort();
  }, [id]);
  if (nb) return <Workspace nb={nb} catalog={catalog} />;
  return (
    <p className="page-loading" role="status">
      {error ? t("lesson.notFound") : t("loading.lesson")} {error && <Link href={coursePath("python")}>{t("lesson.complete.route")}</Link>}
    </p>
  );
}

function useDone(id: string) {
  const [done, setDone] = useState(() => doneIn(id));
  useEffect(() => onProgress(() => setDone(doneIn(id))), [id]);
  return done;
}

function Workspace({ nb, catalog }: { nb: Notebook; catalog: Catalog }) {
  const steps = useMemo(() => buildSteps(nb), [nb]);
  const done = useDone(nb.id);
  const [status, setStatus] = useState(t("runtime.loading"));
  const [edits, setEdits] = useState<Record<string, string>>(() => read().code?.[nb.id] ?? {});
  const [outputs, setOutputs] = useState<Record<string, Output[]>>({});
  const [errors, setErrors] = useState<Record<string, RuntimeError>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [batch, setBatch] = useState(false);
  const [reached, setReached] = useState(() => Math.min(reachedIn(nb.id), steps.length - 1));
  const [showAll, setShowAll] = useState(() => localStorage.getItem(VIEW_KEY) === "all");
  const runner = useRef<Runner | null>(null);
  const running = useRef(false);
  const setupRan = useRef(false);
  const [setupDone, setSetupDone] = useState(false);
  const article = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const [focusStep, setFocusStep] = useState<number | null>(null);

  useEffect(() => {
    runner.current = new Runner((s) => setStatus(s === "Python ready" ? t("runtime.ready") : s));
    document.title = nb.title + " · SwarmLadder Lab";
    return () => {
      runner.current?.dispose();
      runner.current = null;
      document.title = "SwarmLadder Lab";
    };
  }, [nb]);

  // Highlight code examples that live inside the lesson text.
  useEffect(() => {
    for (const block of article.current?.querySelectorAll(".prose pre code.language-python, .prose pre code.language-py") ?? []) {
      if (!block.querySelector(".token")) block.innerHTML = highlightPython(block.textContent ?? "");
    }
  });

  useEffect(() => {
    if (focusStep === null) return;
    const el = stepRefs.current[focusStep];
    el?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    el?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    setFocusStep(null);
  }, [focusStep]);

  const visible = showAll ? steps.length - 1 : reached;
  const lastStep = steps.length - 1;
  const atEnd = visible >= lastStep;
  useEffect(() => {
    if (atEnd) finish(nb.id);
  }, [atEnd, nb.id]);

  function goTo(i: number) {
    const target = Math.min(i, lastStep);
    if (target > reached) {
      reach(nb.id, target);
      setReached(target);
    }
    setFocusStep(target);
  }

  function change(c: CodeCell, v?: string) {
    save(nb.id, c.id, v);
    if (errors[c.id]) setErrors((e) => ({ ...e, [c.id]: null }));
    setEdits((old) => {
      const next = { ...old };
      if (v === undefined) delete next[c.id];
      else next[c.id] = v;
      return next;
    });
  }
  const append = (id: string, name: string, text: string) => setOutputs((o) => ({ ...o, [id]: [...(o[id] ?? []), { name, text }] }));

  const setupCells = nb.cells.filter((c): c is CodeCell => c.type === "code" && c.kind === "setup");
  // Runs are queued so a cell started while the hidden setup is still running waits its turn.
  const chain = useRef<Promise<void>>(Promise.resolve());
  const requested = useRef<string | null>(null);
  function execute(cells: CodeCell[], all = false) {
    const target = cells.filter((c) => c.kind !== "setup").at(-1);
    if (target) requested.current = target.id;
    const next = chain.current.then(() => runCells(cells, all));
    chain.current = next.catch(() => undefined);
    return next;
  }
  async function runCells(cells: CodeCell[], all: boolean) {
    const session = runner.current;
    if (!session || running.current) return;
    running.current = true;
    setBatch(all);
    try {
      // Setup cells (helpers, checkers) run once per Python session, silently.
      const queue = !setupRan.current && !cells.every((c) => c.kind === "setup") ? [...setupCells.filter((s) => !cells.includes(s)), ...cells] : cells;
      for (const c of queue) {
        const quiet = c.kind === "setup" && !cells.includes(c);
        setBusy(c.id);
        if (!quiet) {
          setOutputs((o) => ({ ...o, [c.id]: [] }));
          setErrors((e) => ({ ...e, [c.id]: null }));
        }
        let text = "";
        const code = read().code?.[nb.id]?.[c.id] ?? c.source;
        const result = await session.run(code, "/course/" + nb.folder, (name, chunk) => {
          text += chunk;
          if (!quiet) append(c.id, name, chunk);
        });
        if (session !== runner.current) return;
        if (c.kind === "setup" && !result.error) {
          setupRan.current = true;
          setSetupDone(true);
        }
        if (result.error && !quiet) {
          append(c.id, "stderr", [result.friendly, (!result.friendly || !code.includes("___")) && result.error].filter(Boolean).join("\n"));
          const last = result.error.trim().split("\n").pop() ?? "";
          if (result.line && c.kind !== "check") setErrors((e) => ({ ...e, [c.id]: { line: result.line!, message: last } }));
        }
        const keys = graduatedKeys(text);
        if (keys.length) mark(nb.id, keys);
        if (result.stopped) break;
      }
      requested.current = null;
    } finally {
      if (session === runner.current) {
        running.current = false;
        setBusy(null);
        setBatch(false);
      }
    }
  }
  function restart(clear: boolean) {
    runner.current?.dispose();
    runner.current = new Runner((s) => setStatus(s === "Python ready" ? t("runtime.ready") : s));
    setupRan.current = false;
    setSetupDone(false);
    setStatus(t("runtime.loading"));
    chain.current = Promise.resolve();
    const stoppedCell = requested.current ?? busy;
    requested.current = null;
    if (clear) setOutputs({});
    else if (stoppedCell) append(stoppedCell, "stderr", t("lesson.stopped"));
    running.current = false;
    setBusy(null);
    setBatch(false);
  }

  // Where this lesson sits on the route, for the header and the completion card.
  const r = useMemo(() => route(catalog), [catalog, done.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const here = r.all.findIndex((s) => s.item.id === nb.id);
  const stop = r.all[here];
  const prevStop = here > 0 ? r.all[here - 1] : null;
  const nextStop = here >= 0 ? r.all[here + 1] ?? null : null;
  const { number, name: fullName } = lessonNumber(nb.title);
  const name = topic(fullName);
  const solvedHere = nb.graded.filter((k) => done.includes(k)).length;
  const stepDone = (s: Step, i: number) => (s.keys.length ? s.keys.every((k) => done.includes(k)) : i < reached);

  return (
    <div className="lesson">
      <div className="lesson-bar" role="region" aria-label={t("lesson.steps")}>
        <div className="lesson-bar-row">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href={coursePath("python")}>Python</Link>
            <span aria-hidden="true">/</span>
            <span>{stop?.level.title}</span>
          </nav>
          <span className="lesson-bar-progress">{t("lesson.of", { n: Math.min(visible, lastStep) + 1, total: steps.length })}</span>
          <span className={"runtime " + (status === t("runtime.ready") ? "ready" : "")} role="status">
            <span className="runtime-dot" aria-hidden="true" />
            {status}
          </span>
          <div className="lesson-bar-actions">
            <button className="button quiet small" aria-label={batch ? t("lesson.runningAll") : t("lesson.runAll")} disabled={!!busy} onClick={() => execute(nb.cells.filter((c): c is CodeCell => c.type === "code"), true)}>
              <Play size={14} strokeWidth={1.8} /> <span className="bl">{batch ? t("lesson.runningAll") : t("lesson.runAll")}</span>
            </button>
            <button className="button quiet small" aria-label={t("lesson.stop")} onClick={() => restart(false)}>
              <Square size={13} strokeWidth={1.8} /> <span className="bl">{t("lesson.stop")}</span>
            </button>
            <button className="button quiet small" aria-label={t("lesson.restart")} onClick={() => restart(true)}>
              <RotateCcw size={14} strokeWidth={1.8} /> <span className="bl">{t("lesson.restart")}</span>
            </button>
            <button
              className="button quiet small"
              aria-pressed={showAll}
              aria-label={showAll ? t("lesson.stepByStep") : t("lesson.showAll")}
              onClick={() => {
                localStorage.setItem(VIEW_KEY, showAll ? "steps" : "all");
                setShowAll(!showAll);
              }}
            >
              {showAll ? <ListOrdered size={14} strokeWidth={1.8} /> : <Rows3 size={14} strokeWidth={1.8} />} <span className="bl">{showAll ? t("lesson.stepByStep") : t("lesson.showAll")}</span>
            </button>
          </div>
        </div>
        <div className="lesson-bar-track" aria-hidden="true">
          <span style={{ width: `${(100 * (Math.min(visible, lastStep) + 1)) / steps.length}%` }} />
        </div>
      </div>

      <header className="lesson-head">
        <div className="shell lesson-head-grid">
          <div>
            <p className="eyebrow">
              {stop?.level.title} {stop && stop.kind !== "lesson" ? "· " + t(stop.kind === "practice" ? "course.practice" : stop.kind === "build" ? "course.build" : "course.examples") : ""}
            </p>
            <h1 className="lesson-title">
              {number && <span className="lesson-number">{number}</span>}
              {name}
            </h1>
            <p className="lesson-meta">
              <span className="meta-chip">{t("lesson.stepCount", { n: steps.length })}</span>
              {nb.graded.length > 0 && <span className={"meta-chip" + (solvedHere === nb.graded.length ? " complete" : "")}>{solvedHere} / {t("course.checks", { n: nb.graded.length })}</span>}
              <span className="meta-links">
                {t("lesson.sources")}{" "}
                <a href={courseRepo + "/blob/main/" + nb.id + ".ipynb"}>GitHub</a>
                <a href={"https://colab.research.google.com/github/SwarmLadder/python-notebook/blob/main/" + nb.id + ".ipynb"}>Colab</a>
              </span>
            </p>
          </div>

        </div>
        {number && <span className="lesson-numeral" aria-hidden="true">{number}</span>}
      </header>

      <div className="lesson-layout shell">
        <aside className="step-rail" aria-label={t("lesson.steps")}>
          <p className="eyebrow">{t("lesson.steps")}</p>
          <ol style={{ ["--fill" as string]: `${steps.length > 1 ? (100 * (showAll ? lastStep : Math.min(visible, lastStep))) / (steps.length - 1) : 0}%` }}>
            {steps.map((s, i) => {
              const state = stepDone(s, i) ? "done" : i === visible && !showAll ? "current" : i <= visible ? "open" : "ahead";
              return (
                <li key={i} className={state}>
                  {s.part && <span className="step-rail-part">{s.part}</span>}
                  <button onClick={() => goTo(i)} aria-current={i === visible && !showAll ? "step" : undefined}>
                    <span className="step-rail-node" aria-hidden="true">{state === "done" ? <Check size={11} strokeWidth={2.6} /> : i + 1}</span>
                    <span className="step-rail-title">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="steps" ref={article}>
          {steps.slice(0, visible + 1).map((s, i) => (
            <section key={i} className={"step" + (stepDone(s, i) ? " done" : "")} ref={(el) => { stepRefs.current[i] = el; }} aria-labelledby={`step-${i}`}>
              <header className="step-head">
                {s.part && <p className="step-part">{s.part}</p>}
                <p className="eyebrow">{t("lesson.step", { n: i + 1 })}</p>
                <h2 id={`step-${i}`} tabIndex={-1}>{s.title}</h2>
              </header>
              {s.quiz && <Quiz quiz={s.quiz} nbId={nb.id} done={done} />}
              {s.cells.map((c, ci) => {
                if (c.type === "md") return <div key={ci} className="prose" dangerouslySetInnerHTML={{ __html: c.html }} />;
                if (c.kind === "quiz" && s.quiz) return null;
                if (c.kind === "setup")
                  return (
                    <p key={c.id} className={"setup-cell" + (setupDone ? " ready" : "")}>
                      <span className="setup-dot" aria-hidden="true" />
                      {setupDone ? t("lesson.setupReady") : t("lesson.setupLoading")}
                    </p>
                  );
                const before = s.cells.slice(0, ci).filter((x): x is CodeCell => x.type === "code" && x.kind === "code");
                return (
                  <CodeSpecimen
                    key={c.id}
                    cell={c}
                    value={edits[c.id] ?? c.source}
                    busy={busy}
                    output={outputs[c.id]}
                    solved={keysFor(c).length > 0 && keysFor(c).every((k) => done.includes(k))}
                    runner={runner}
                    error={errors[c.id] ?? null}
                    onChange={(v) => change(c, v)}
                    onRun={() => execute(c.kind === "check" ? [...before, c] : [c])}
                  />
                );
              })}
              {!showAll && i === visible && i < lastStep && (
                <div className="step-continue">
                  <button className="button primary" onClick={() => goTo(i + 1)}>
                    {t("lesson.continueTo", { title: steps[i + 1].title })} <ArrowRight size={18} strokeWidth={1.8} />
                  </button>
                  <span className="step-continue-count">{t("lesson.of", { n: i + 2, total: steps.length })}</span>
                </div>
              )}
            </section>
          ))}

          {atEnd && (
            <section className="lesson-end" aria-labelledby="lesson-end">
              <div className="lesson-end-art" aria-hidden="true">
                <LadderMark size={96} />
              </div>
              <div className="lesson-end-body">
                <p className="eyebrow">{t("lesson.complete.eyebrow", { level: stop?.level.title ?? "" })}</p>
                <h2 id="lesson-end">{t("lesson.complete.title")}</h2>
                <p>{t("lesson.complete.body")}</p>
                <dl className="lesson-end-stats">
                  <div><dt>{t("lesson.complete.steps")}</dt><dd>{steps.length}</dd></div>
                  {nb.graded.length > 0 && <div><dt>{t("lesson.complete.checks")}</dt><dd>{solvedHere}<small> / {nb.graded.length}</small></dd></div>}
                  {here >= 0 && <div><dt>{t("lesson.complete.route2")}</dt><dd>{here + 1}<small> / {r.all.length}</small></dd></div>}
                </dl>
                <div className="lesson-end-actions">
                  {nextStop && (
                    <Link className="button primary" href={lessonPath(nextStop.item.id)}>
                      {t("lesson.complete.next", { title: lessonNumber(nextStop.item.title).name })} <ArrowRight size={18} strokeWidth={1.8} />
                    </Link>
                  )}
                  <Link className="button quiet" href={coursePath("python")}>{t("lesson.complete.route")}</Link>
                </div>
              </div>
            </section>
          )}

          <nav className="pager" aria-label="Lessons">
            {prevStop ? (
              <Link href={lessonPath(prevStop.item.id)}>
                <ArrowLeft size={16} strokeWidth={1.8} /> <span><small>{t("lesson.prev")}</small>{lessonNumber(prevStop.item.title).name}</span>
              </Link>
            ) : <span />}
            {nextStop && (
              <Link href={lessonPath(nextStop.item.id)} className="pager-next">
                <span><small>{t("lesson.nextLesson")}</small>{lessonNumber(nextStop.item.title).name}</span> <ArrowRight size={16} strokeWidth={1.8} />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}

function label(cell: CodeCell) {
  if (cell.kind === "exercise") return t("lesson.exercise", { n: cell.source.match(/check\((\d+),/)?.[1] ?? "" });
  if (cell.kind === "check") return t("lesson.check") + " · " + (cell.source.match(/check\('([^']+)'\)/)?.[1] ?? "");
  if (/___/.test(cell.source)) return t("lesson.yourCode");
  return t("lesson.example");
}

function lineClass(line: string) {
  if (/^\s*✅/.test(line)) return "ok";
  if (/^\s*❌/.test(line)) return "no";
  if (/^\s*✏️/.test(line)) return "todo";
  if (/hint \d\/\d:/.test(line)) return "hint";
  return "";
}

function CodeSpecimen({ cell, value, busy, output, solved, onChange, onRun, runner, error }: {
  cell: CodeCell; value: string; busy: string | null; output?: Output[]; solved: boolean;
  onChange: (v?: string) => void; onRun: () => void; runner: { current: Runner | null }; error: RuntimeError;
}) {
  const isCheck = cell.kind === "check";
  const text = output?.map((o) => o.text).join("") ?? "";
  const errText = output?.filter((o) => o.name === "stderr").map((o) => o.text).join("") ?? "";
  const lines = text.replace(errText, "").split(/(?<=\n)/);
  const outcome = busy === cell.id ? "" : errText || lines.some((l) => lineClass(l) === "no") ? "is-error" : lines.some((l) => lineClass(l) === "ok") ? "is-ok" : "";
  return (
    <div className={"code-cell kind-" + cell.kind + (busy === cell.id ? " busy" : "") + (solved ? " solved" : "")}>
      <div className="cell-tools">
        <span className="cell-label">
          {label(cell)}
          {solved && <span className="cell-solved"><Check size={13} strokeWidth={2.4} /> {t("lesson.solved")}</span>}
        </span>
        <span className="cell-buttons">
          {!isCheck && (
            <button
              className="button quiet small"
              onClick={() => {
                if (value === cell.source || confirm(t("lesson.resetConfirm"))) onChange(undefined);
              }}
            >
              {t("lesson.reset")}
            </button>
          )}
          <button className="button small run cell-run" disabled={!!busy} onClick={onRun}>
            <Play size={13} strokeWidth={2} /> {isCheck ? t("lesson.check") : t("lesson.run")}
          </button>
        </span>
      </div>
      {isCheck ? (
        <p className="check-line">{t("lesson.checkHint")}</p>
      ) : (
        <CodeEditor value={value} onChange={(v) => onChange(v)} onRun={onRun} runner={runner} error={error} />
      )}
      {(output !== undefined || busy === cell.id) && (
        <div className={"output-wrap " + outcome}>
          <span className="output-label">
            {outcome === "is-ok" ? <><Check size={12} strokeWidth={2.6} /> {t("lesson.passed")}</> : outcome === "is-error" ? <>✕ {t("lesson.failed")}</> : t("lesson.output")}
          </span>
          <pre className="output" aria-live="polite">
            {!text && <span className="output-hint">{busy === cell.id ? t("lesson.running") : t("lesson.noOutput")}</span>}
            {lines.map((line, i) => (
                <span key={i} className={lineClass(line)}>{line}</span>
              ))}
            {errText && <span className="stderr">{errText}</span>}
          </pre>
        </div>
      )}
    </div>
  );
}

function Quiz({ quiz, nbId, done }: { quiz: QuizData; nbId: string; done: string[] }) {
  const [picked, setPicked] = useState<Record<number, { letter: string; ok: boolean }>>({});
  const [correct, setCorrect] = useState<Record<number, string>>({});
  // Reveal which option was right for questions already answered correctly.
  useEffect(() => {
    let alive = true;
    (async () => {
      const found: Record<number, string> = {};
      for (const q of quiz.questions) {
        if (!done.includes("q" + q.number)) continue;
        for (const o of q.options) if ((await quizFingerprint(quiz.id, q.number, o.letter)) === quiz.hashes[q.number]) found[q.number] = o.letter;
      }
      if (alive) setCorrect(found);
    })();
    return () => { alive = false; };
  }, [quiz, done]);
  async function choose(n: number, letter: string) {
    const ok = (await quizFingerprint(quiz.id, n, letter)) === quiz.hashes[n];
    setPicked((p) => ({ ...p, [n]: { letter, ok } }));
    if (ok) {
      mark(nbId, ["q" + n]);
      setCorrect((c) => ({ ...c, [n]: letter }));
    }
  }
  return (
    <ol className="quiz">
      {quiz.questions.map((q) => {
        const answered = correct[q.number];
        const pick = picked[q.number];
        return (
          <li key={q.number} className={"quiz-q" + (answered ? " right" : "")}>
            <fieldset>
              <legend>
                <span className="quiz-n">{q.number}</span>
                <span dangerouslySetInnerHTML={{ __html: q.html }} />
              </legend>
              <div className="quiz-options">
                {q.options.map((o) => {
                  const state = answered === o.letter ? "right" : pick?.letter === o.letter && !pick.ok ? "wrong" : "";
                  return (
                    <button key={o.letter} className={"quiz-option " + state} aria-pressed={pick?.letter === o.letter || answered === o.letter} disabled={Boolean(answered)} onClick={() => choose(q.number, o.letter)}>
                      <span className="quiz-letter">{o.letter}</span>
                      <span dangerouslySetInnerHTML={{ __html: o.html }} />
                    </button>
                  );
                })}
              </div>
              <p className="quiz-feedback" role="status">
                {answered ? t("lesson.quizCorrect") : pick && !pick.ok ? t("lesson.quizWrong") : ""}
              </p>
            </fieldset>
          </li>
        );
      })}
    </ol>
  );
}
