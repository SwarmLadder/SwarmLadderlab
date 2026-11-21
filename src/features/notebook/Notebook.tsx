"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, PanelLeft, Play, RotateCcw, Square } from "lucide-react";
import { courseRepo, lessonPath, notebookData, type Catalog, type CodeCell, type Notebook } from "../../lib/course";
import { coursePath } from "../../lib/courses";
import { topic, lessonNumber, route } from "../../lib/journey";
import { doneIn, finish, graduatedKeys, mark, onProgress, read, save, setLast } from "../progress/store";
import { highlightPython } from "../../lib/pythonSyntax";
import { Runner } from "../../workers/runner";
import { LadderMark } from "../../components/Brand";
import { CodeEditor, type RuntimeError } from "../../components/CodeEditor";
import { buildSteps, keysFor, quizFingerprint, type QuizData, type Step } from "./steps";
import { t } from "../../i18n";

type Output = { name: string; text: string };

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

type View = "notebook" | "practice";
type Outcome = "ok" | "no" | "ran";
const TOC_KEY = "swarmladderlab.toc";
const plain = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

function Workspace({ nb, catalog }: { nb: Notebook; catalog: Catalog }) {
  const steps = useMemo(() => buildSteps(nb), [nb]);
  const done = useDone(nb.id);
  const viewKey = "swarmladderlab.view." + nb.id;
  const isWorkbook = nb.id.includes("/exercises/");
  const [view, setView] = useState<View>(() => (localStorage.getItem(viewKey) as View | null) ?? (isWorkbook ? "practice" : "notebook"));
  const [tocOpen, setTocOpen] = useState(() => localStorage.getItem(TOC_KEY) !== "closed");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [status, setStatus] = useState(t("runtime.loading"));
  const [edits, setEdits] = useState<Record<string, string>>(() => read().code?.[nb.id] ?? {});
  const [outputs, setOutputs] = useState<Record<string, Output[]>>({});
  const [errors, setErrors] = useState<Record<string, RuntimeError>>({});
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [batch, setBatch] = useState(false);
  const runner = useRef<Runner | null>(null);
  const running = useRef(false);
  const runCount = useRef(0);
  const setupRan = useRef(false);
  const [setupDone, setSetupDone] = useState(false);
  const article = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

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
          setCounts((n) => ({ ...n, [c.id]: ++runCount.current }));
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
        if (!quiet) setOutcomes((o) => ({ ...o, [c.id]: result.error || /❌/.test(text) ? "no" : keys.length ? "ok" : "ran" }));
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
    if (clear) {
      setOutputs({});
      setOutcomes({});
      setCounts({});
      runCount.current = 0;
    } else if (stoppedCell) append(stoppedCell, "stderr", t("lesson.stopped"));
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
  const graded = nb.graded.length;
  const solvedHere = nb.graded.filter((k) => done.includes(k)).length;
  const complete = graded > 0 && solvedHere === graded;

  // Practice items: every step that holds a check or a quiz.
  const isPractice = (s: Step) => s.keys.length > 0 || Boolean(s.quiz);
  const stepStatus = (s: Step): "ok" | "no" | "todo" =>
    s.keys.length && s.keys.every((k) => done.includes(k))
      ? "ok"
      : s.cells.some((c) => c.type === "code" && outcomes[c.id] === "no")
        ? "no"
        : "todo";
  const practice = steps.map((s, i) => ({ s, i })).filter(({ s }) => isPractice(s));
  const learn = steps.map((s, i) => ({ s, i })).filter(({ s }) => !isPractice(s));
  const nextUp = practice.find(({ s }) => stepStatus(s) !== "ok");
  // The outline follows the lesson: each taught section with its questions as dots.
  type Group = { i: number; title: string; practiceOnly: boolean; items: { s: Step; i: number }[] };
  const groups: Group[] = [];
  steps.forEach((st, i) => {
    if (i === 0 && st.title === "Overview" && !st.cells.some((c) => c.type === "md")) return;
    if (!isPractice(st)) groups.push({ i, title: st.title, practiceOnly: false, items: [] });
    else if (groups.length && !groups[groups.length - 1].practiceOnly) groups[groups.length - 1].items.push({ s: st, i });
    else groups.push({ i, title: st.quiz ? t("lesson.quiz") : st.title, practiceOnly: true, items: [{ s: st, i }] });
  });

  // Ungraded pages count as finished once the reader reaches the end.
  useEffect(() => {
    if (complete) finish(nb.id);
  }, [complete, nb.id]);
  useEffect(() => {
    if (graded || !bottom.current || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && finish(nb.id));
    io.observe(bottom.current);
    return () => io.disconnect();
  }, [graded, nb.id]);

  function switchView(v: View) {
    setView(v);
    localStorage.setItem(viewKey, v);
  }
  function jump(i: number) {
    const show = view === "practice" && !isPractice(steps[i]);
    if (show) setReviewOpen(true);
    requestAnimationFrame(() =>
      document.getElementById(`step-${i}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }),
    );
  }
  function toggleToc() {
    localStorage.setItem(TOC_KEY, tocOpen ? "closed" : "open");
    setTocOpen(!tocOpen);
  }

  function renderStep(s: Step, i: number) {
    const practiceStep = isPractice(s);
    // An exercise's prompt moves into the cell header; the rest of its text stays as text.
    const promptCell = practiceStep && !s.quiz ? s.cells.find((c) => c.type === "md") : undefined;
    const prompt = promptCell && promptCell.type === "md" ? plain(promptCell.html).replace(/^Exercise \d+\.\s*/, "") : "";
    // A challenge is a function cell plus a check cell: the task sits on the function.
    const checkCell = s.cells.find((c): c is CodeCell => c.type === "code" && c.kind === "check");
    const challenge = checkCell?.source.match(/check\('([^']+)'\)/)?.[1];
    const fnCell = challenge ? s.cells.find((c): c is CodeCell => c.type === "code" && c.kind === "code" && c.source.includes("def " + challenge)) : undefined;
    return (
      <section key={i} id={`step-${i}`} className={"nb-step" + (practiceStep ? " is-practice" : "")} aria-labelledby={`step-h-${i}`}>
        {s.part && <p className="nb-part">{s.part}</p>}
        <h2 id={`step-h-${i}`} className={(practiceStep && !s.quiz) || (i === 0 && s.title === "Overview") ? "sr-only" : "nb-heading"}>{s.title}</h2>
        {s.quiz && <Quiz quiz={s.quiz} nbId={nb.id} done={done} />}
        {s.cells.map((c, ci) => {
          if (c === promptCell) return null;
          if (c.type === "md") return <div key={ci} className="nb-text prose" dangerouslySetInnerHTML={{ __html: c.html }} />;
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
              prompt={c === fnCell || (c.kind === "exercise") || (c.kind === "check" && !fnCell) ? prompt : ""}
              tag={c === fnCell ? t("lesson.challenge", { name: challenge ?? "" }) : undefined}
              value={edits[c.id] ?? c.source}
              busy={busy}
              output={outputs[c.id]}
              count={counts[c.id]}
              solved={keysFor(c).length > 0 && keysFor(c).every((k) => done.includes(k))}
              runner={runner}
              error={errors[c.id] ?? null}
              onChange={(v) => change(c, v)}
              onRun={() => execute(c.kind === "check" ? [...before, c] : [c])}
            />
          );
        })}
      </section>
    );
  }

  const ready = status === t("runtime.ready");
  return (
    <div className={"nbook" + (tocOpen ? " toc-open" : "")}>
      <div className="nb-bar" role="toolbar" aria-label={t("lesson.tools")}>
        <button className="nb-btn icon" onClick={toggleToc} aria-pressed={tocOpen} aria-label={t("lesson.contents")} title={t("lesson.contents")}>
          <PanelLeft size={16} />
        </button>
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href={coursePath("python")}>Python</Link>
          <span aria-hidden="true">/</span>
          <span>{stop?.level.title}</span>
        </nav>
        <div className="seg" role="group" aria-label={t("lesson.view")}>
          <button aria-pressed={view === "notebook"} onClick={() => switchView("notebook")}>{t("lesson.notebook")}</button>
          <button aria-pressed={view === "practice"} onClick={() => switchView("practice")}>{t("lesson.practice")}</button>
        </div>
        <button className="nb-btn" disabled={!!busy} onClick={() => execute(nb.cells.filter((c): c is CodeCell => c.type === "code"), true)} aria-label={batch ? t("lesson.runningAll") : t("lesson.runAll")}>
          <Play size={14} /> <span className="bl">{batch ? t("lesson.runningAll") : t("lesson.runAll")}</span>
        </button>
        <button className="nb-btn" onClick={() => restart(false)} aria-label={t("lesson.stop")}>
          <Square size={13} /> <span className="bl">{t("lesson.stop")}</span>
        </button>
        <button className="nb-btn" onClick={() => restart(true)} aria-label={t("lesson.restart")}>
          <RotateCcw size={14} /> <span className="bl">{t("lesson.restart")}</span>
        </button>
        <span className={"runtime chip" + (ready ? " ready" : "")} role="status">
          <span className="runtime-dot" aria-hidden="true" />
          {status}
        </span>
        {nextUp && (
          <button className="nb-btn nb-next" onClick={() => jump(nextUp.i)}>
            {t("lesson.nextUp", { title: nextUp.s.quiz ? t("lesson.quiz") : nextUp.s.title })} <ArrowRight size={14} />
          </button>
        )}
        {graded > 0 && (
          <span className="nb-score" aria-label={t("lesson.score", { n: solvedHere, total: graded })}>
            <span className="nb-meter"><span style={{ width: `${(100 * solvedHere) / graded}%` }} /></span>
            <b>{solvedHere}</b>/{graded}
          </span>
        )}
      </div>

      <div className="nb-body">
        <aside className="nb-toc" aria-label={t("lesson.contents")} hidden={!tocOpen}>
          <p className="nb-toc-title">{t("lesson.contents")}</p>
          {groups.map((g) => (
            <div key={g.i} className="toc-group">
              <button onClick={() => jump(g.i)} className={g.items.some((x) => x.i === nextUp?.i) ? "here" : ""}>
                {g.practiceOnly ? (
                  <span className={"toc-mark " + stepStatus(steps[g.i])} aria-hidden="true">{stepStatus(steps[g.i]) === "ok" ? <Check size={10} strokeWidth={3} /> : null}</span>
                ) : (
                  <span className="toc-mark doc" aria-hidden="true" />
                )}
                {g.title}
              </button>
              {g.items.length > (g.practiceOnly ? 1 : 0) && (
                <div className="toc-dots">
                  {g.items.map(({ s: it, i }) => (
                    <button key={i} className={"dot " + stepStatus(it) + (nextUp?.i === i ? " next" : "")} onClick={() => jump(i)} title={it.title} aria-label={it.title} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </aside>

        <main className="nb-main" ref={article}>
          <div className="nb-page">
            <header className="nb-head">
              <h1>
                {number && <small>{number}</small>}
                {name}
              </h1>
              <p className="nb-links">
                <a href={courseRepo + "/blob/main/" + nb.id + ".ipynb"}>GitHub</a>
                <a href={"https://colab.research.google.com/github/SwarmLadder/python-notebook/blob/main/" + nb.id + ".ipynb"}>Colab</a>
              </p>
            </header>

            {view === "practice" && learn.length > 0 && (
              <button className="review-bar" aria-expanded={reviewOpen} onClick={() => setReviewOpen(!reviewOpen)}>
                <BookOpen size={15} />
                <b>{t("lesson.review")}</b>
                <span className="review-topics">{learn.map(({ s }) => s.title).join(" · ")}</span>
                <span className="review-toggle">{reviewOpen ? t("lesson.hide") : t("lesson.show")}</span>
              </button>
            )}

            {steps.map((s, i) => (view === "notebook" || isPractice(s) || reviewOpen ? renderStep(s, i) : null))}

            <div ref={bottom} />
            {(complete || (!graded && here >= 0)) && (
              <section className="lesson-end" aria-labelledby="lesson-end">
                <div className="lesson-end-art" aria-hidden="true">
                  <LadderMark size={96} />
                </div>
                <div className="lesson-end-body">
                  <p className="eyebrow">{t("lesson.complete.eyebrow", { level: stop?.level.title ?? "" })}</p>
                  <h2 id="lesson-end">{complete ? t("lesson.complete.title") : t("lesson.complete.read")}</h2>
                  <div className="lesson-end-actions">
                    {nextStop && (
                      <Link className="button primary" href={lessonPath(nextStop.item.id)}>
                        {t("lesson.complete.next", { title: topic(lessonNumber(nextStop.item.title).name) })} <ArrowRight size={18} strokeWidth={1.8} />
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
                  <ArrowLeft size={16} strokeWidth={1.8} /> <span><small>{t("lesson.prev")}</small>{topic(lessonNumber(prevStop.item.title).name)}</span>
                </Link>
              ) : <span />}
              {nextStop && (
                <Link href={lessonPath(nextStop.item.id)} className="pager-next">
                  <span><small>{t("lesson.nextLesson")}</small>{topic(lessonNumber(nextStop.item.title).name)}</span> <ArrowRight size={16} strokeWidth={1.8} />
                </Link>
              )}
            </nav>
          </div>
        </main>
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

function CodeSpecimen({ cell, prompt, tag, value, busy, output, count, solved, onChange, onRun, runner, error }: {
  cell: CodeCell; prompt: string; tag?: string; value: string; busy: string | null; output?: Output[]; count?: number; solved: boolean;
  onChange: (v?: string) => void; onRun: () => void; runner: { current: Runner | null }; error: RuntimeError;
}) {
  const isCheck = cell.kind === "check";
  const isTask = cell.kind === "exercise" || isCheck || /___/.test(cell.source);
  const running = busy === cell.id;
  const text = output?.map((o) => o.text).join("") ?? "";
  const errText = output?.filter((o) => o.name === "stderr").map((o) => o.text).join("") ?? "";
  const lines = text.replace(errText, "").split(/(?<=\n)/).filter((l, i, all) => l || i < all.length - 1);
  const outcome = running ? "" : errText || lines.some((l) => lineClass(l) === "no") ? "is-error" : lines.some((l) => lineClass(l) === "ok") ? "is-ok" : "";
  const runLabel = isCheck ? t("lesson.check") : t("lesson.run");
  return (
    <div className={"nb-cell" + (isTask ? " is-task" : "") + (solved ? " solved" : "") + (outcome === "is-error" ? " failed" : "")}>
      <div className="nb-gutter">
        <button className={"nb-play" + (running ? " running" : "")} disabled={!!busy && !running} onClick={onRun} aria-label={runLabel + " · " + label(cell)} title={runLabel + " (Shift + Enter)"}>
          {running ? <span className="nb-spin" aria-hidden="true" /> : <Play size={12} fill="currentColor" strokeWidth={0} />}
        </button>
        <span className="nb-count" aria-hidden="true">[{running ? "*" : count ?? " "}]</span>
      </div>
      <div className={"code-cell kind-" + cell.kind + (running ? " busy" : "") + (solved ? " solved" : "")}>
        {isTask && (
          <div className="cell-head">
            <span className="cell-tag">
              {solved && <Check size={12} strokeWidth={2.8} />} {tag ?? label(cell)}
            </span>
            {prompt && <span className="cell-prompt">{prompt}</span>}
            <span className="cell-actions">
              {!isCheck && (
                <button
                  className="mini"
                  onClick={() => {
                    if (value === cell.source || confirm(t("lesson.resetConfirm"))) onChange(undefined);
                  }}
                >
                  {t("lesson.reset")}
                </button>
              )}
              {isCheck && (
                <button className="mini strong cell-run" disabled={!!busy} onClick={onRun}>
                  {t("lesson.check")}
                </button>
              )}
            </span>
          </div>
        )}
        {isCheck ? (
          <p className="check-line">{t("lesson.checkHint")}</p>
        ) : (
          <CodeEditor value={value} onChange={(v) => onChange(v)} onRun={onRun} runner={runner} error={error} />
        )}
        {isTask && !solved && !isCheck && (
          <p className="cell-tip">
            <b>{t("lesson.tip")}</b>
            {/___/.test(value) && <span>{t("lesson.tipBlanks")}</span>}
            <span><kbd>⇧</kbd> <kbd>↵</kbd> {t("lesson.tipRun")}</span>
            <span>{t("lesson.tipHint")}</span>
          </p>
        )}
        {(output !== undefined || running) && (
          <div className={"output-wrap " + outcome}>
            {outcome && (
              <span className="output-label">
                {outcome === "is-ok" ? <><Check size={12} strokeWidth={2.6} /> {t("lesson.passed")}</> : <>✕ {t("lesson.failed")}</>}
              </span>
            )}
            <pre className="output" aria-live="polite">
              {!text && <span className="output-hint">{running ? t("lesson.running") : t("lesson.noOutput")}</span>}
              {lines.map((line, i) => (
                <span key={i} className={lineClass(line)}>{line}</span>
              ))}
              {errText && <span className="stderr">{errText}</span>}
            </pre>
          </div>
        )}
      </div>
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
