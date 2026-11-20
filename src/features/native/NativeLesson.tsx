"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clipboard, RotateCcw, Play } from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-bash";
import { CodeEditor } from "../../components/CodeEditor";
import { lessonPath, type Catalog } from "../../lib/course";
import { route } from "../../lib/journey";
import { doneIn, finish, isFinished, mark, onProgress, read, save, setLast } from "../progress/store";

type NativePage = {
  id: string;
  title: string;
  guideHtml: string;
  sourcePath: string;
  source: string;
  checkCommand: string;
  practiceCommand: string;
  graded: string[];
  mode: "local-git" | "local-rust";
  hint: string;
};

const UPSTREAM: Record<string, { url: string; name: string; install: string }> = {
  git: {
    url: "https://github.com/SwarmLadder/git-github-course",
    name: "Git & GitHub",
    install: "git clone https://github.com/SwarmLadder/git-github-course.git",
  },
  rust: {
    url: "https://github.com/SwarmLadder/RUST",
    name: "Rust",
    install: "git clone https://github.com/SwarmLadder/RUST.git",
  },
};

export function NativeLesson({ id, catalog }: { id: string; catalog: Catalog }) {
  const [lesson, setLesson] = useState<NativePage | null>(null);
  const [error, setError] = useState("");
  const courseId = id.startsWith("git/") ? "git" : "rust";
  useEffect(() => {
    const controller = new AbortController();
    setLesson(null);
    const file = encodeURIComponent(id.replaceAll("/", "__")) + ".json";
    fetch("/data/" + courseId + "/nb/" + file, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the source course activity");
        return response.json() as Promise<NativePage>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setLast(data.id);
          setLesson(data);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(String(cause));
      });
    return () => controller.abort();
  }, [id, courseId]);

  if (!lesson) {
    return (
      <div className="shell page-pad" role="status">
        {error || ("Loading " + UPSTREAM[courseId].name + " activity…")}{" "}
        {error && <Link href={"/learn/" + courseId}>Return to course</Link>}
      </div>
    );
  }
  return <Workspace key={lesson.id} lesson={lesson} catalog={catalog} courseId={courseId} />;
}

function Workspace({ lesson, catalog, courseId }: {
  lesson: NativePage;
  catalog: Catalog;
  courseId: "git" | "rust";
}) {
  const upstream = UPSTREAM[courseId];
  const isGraded = lesson.graded.includes("self-reported");
  const [draft, setDraft] = useState(() => read().code?.[lesson.id]?.draft ?? lesson.source);
  const [complete, setComplete] = useState(() =>
    isGraded ? doneIn(lesson.id).includes("self-reported") : isFinished(lesson.id));
  const [attested, setAttested] = useState(false);
  const [message, setMessage] = useState("");
  const guideRef = useRef<HTMLDivElement>(null);
  const r = useMemo(() => route(catalog), [catalog, complete]);
  const index = r.all.findIndex((s) => s.item.id === lesson.id);
  const previous = index > 0 ? r.all[index - 1] : null;
  const next = index >= 0 ? r.all[index + 1] ?? null : null;
  const level = index >= 0 ? r.all[index].level.title : "Course";

  useEffect(() => onProgress(() =>
    setComplete(isGraded ? doneIn(lesson.id).includes("self-reported") : isFinished(lesson.id))
  ), [lesson.id, isGraded]);
  useEffect(() => {
    document.title = lesson.title + " · SwarmLadder Lab";
    return () => { document.title = "SwarmLadder Lab"; };
  }, [lesson.title]);

  useEffect(() => {
    guideRef.current?.querySelectorAll<HTMLElement>("pre code").forEach((block) => {
      if (block.classList.contains("language-sh") || block.classList.contains("language-shell")) {
        block.classList.add("language-bash");
      }
      if (block.className.includes("language-")) Prism.highlightElement(block);
    });
  }, [lesson.id]);

  function openInPlayground() {
    save("playground", courseId === "git" ? "scratch.sh" : "scratch.rs", draft);
    window.location.assign("/playground?language=" + courseId);
  }

  function updateDraft(value: string) {
    setDraft(value);
    save(lesson.id, "draft", value);
    setMessage("Draft saved in this browser.");
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(label + " copied.");
    } catch {
      setMessage("Clipboard unavailable. Select the text and copy it manually.");
    }
  }

  function completeActivity() {
    if (isGraded && !attested) return;
    if (isGraded) mark(lesson.id, ["self-reported"]);
    else finish(lesson.id);
    setComplete(true);
    setMessage(isGraded
      ? "Saved as verified locally — your confirmation, not a browser-run check."
      : "Reading completed. Progress saved on this device.");
  }

  return (
    <div className="lesson native-lesson">
      <div className="lesson-bar" role="region" aria-label={upstream.name + " course tools"}>
        <div className="lesson-bar-row">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href={"/learn/" + courseId}>{upstream.name}</Link>
            <span aria-hidden="true">/</span>
            <span>{level}</span>
          </nav>
          <span className="runtime" role="status">
            <span className="runtime-dot" aria-hidden="true" />
            Local {courseId === "git" ? "Git" : "Cargo"} verification
          </span>
        </div>
      </div>

      <header className="lesson-head">
        <div className="shell lesson-head-grid">
          <div>
            <p className="eyebrow">{level} · {courseId === "git" ? "Version control" : "Rust engineering"}</p>
            <h1 className="lesson-title">{lesson.title}</h1>
            <p className="lesson-meta">
              <span className={"meta-chip" + (complete ? " complete" : "")}>
                {complete ? "✓ Completed" : isGraded ? "Local verification required" : "Guided activity"}
              </span>
              <span className="meta-links">
                Source: <a href={upstream.url + "/blob/main/" + lesson.sourcePath}
                  target="_blank" rel="noopener noreferrer">GitHub</a>
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="lesson-layout shell">
        <aside className="step-rail" aria-label="Course navigation">
          <p className="eyebrow">Your learning path</p>
          <ol>
            <li className={complete ? "done" : "current"}>
              <Link href={"/learn/" + courseId}>
                <span className="step-rail-node" aria-hidden="true">{complete ? <Check size={12} /> : "1"}</span>
                <span className="step-rail-title">{upstream.name} course</span>
              </Link>
            </li>
          </ol>
          <p className="native-caution">
            {courseId === "git"
              ? "Actual Git commands and grading run in a disposable local repository, not on this website."
              : "Rust drafts are editable here; run the compiler and tests with Cargo on your computer."}
            {" "}Progress is stored in this browser.
          </p>
        </aside>

        <div className="steps">
          <section className="step" aria-labelledby="native-guide">
            <header className="step-head">
              <p className="eyebrow">Read · Practice · Verify</p>
              <h2 id="native-guide">Activity guide</h2>
            </header>
            <div ref={guideRef} className="prose" dangerouslySetInnerHTML={{ __html: lesson.guideHtml }} />
            {lesson.hint && (
              <details className="sql-hint">
                <summary>Show a hint</summary>
                <p>{lesson.hint}</p>
              </details>
            )}

            <div className="native-verify">
              <h3>Practice using the upstream course</h3>
              <p>
                Clone the source repository once, then follow this activity in your own checkout.
                {courseId === "git"
                  ? " The source Git checker creates isolated practice repositories."
                  : " The source Cargo tests compile real Rust and check your implementation."}
              </p>
              <div className="native-command">
                <code>{upstream.install}</code>
                <button type="button" className="button quiet small"
                  onClick={() => copy(upstream.install, "Clone command")}>
                  <Clipboard size={14} /> Copy
                </button>
              </div>
              {lesson.practiceCommand && (
                <div>
                  <p className="native-command-label">Start local practice</p>
                  <div className="native-command">
                    <code>{lesson.practiceCommand}</code>
                    <button type="button" className="button quiet small"
                      onClick={() => copy(lesson.practiceCommand, "Practice command")}>
                      <Clipboard size={14} /> Copy
                    </button>
                  </div>
                </div>
              )}
              {lesson.checkCommand && (
                <div>
                  <p className="native-command-label">Local verification command</p>
                  <div className="native-command">
                    <code>{lesson.checkCommand}</code>
                    <button type="button" className="button quiet small"
                      onClick={() => copy(lesson.checkCommand, "Check command")}>
                      <Clipboard size={14} /> Copy
                    </button>
                  </div>
                </div>
              )}
              <p className="native-caution">
                The Lab does not execute Git commands or compile Rust.
                A completion recorded here is self-reported; it does not
                prove your local tests passed.
              </p>
            </div>

            {lesson.source && (
              <div className="code-cell kind-code native-workspace">
                <div className="cell-tools">
                  <span className="cell-label">{courseId === "git" ? "Editable command notes" : "Rust code draft"}</span>
                  <span className="cell-buttons">
                    <button type="button" className="button quiet small"
                      onClick={() => updateDraft(lesson.source)}>
                      <RotateCcw size={14} /> Reset
                    </button>
                    <button type="button" className="button quiet small"
                      onClick={() => copy(draft, "Draft")}>
                      <Clipboard size={14} /> Copy draft
                    </button>
                    <button type="button" className="button quiet small" onClick={openInPlayground}>
                      <Play size={14} /> Try in Playground
                    </button>
                  </span>
                </div>
                <CodeEditor
                  language={courseId}
                  value={draft}
                  onChange={updateDraft}
                  onRun={openInPlayground}
                  label={courseId === "git" ? "Git command notes" : "Rust code draft"}
                />
                <p className="native-caution">
                  Highlighted editing, completion and Shift+Enter to open the Playground are available.
                  The Playground supports a Git command simulator or Rust source compilation;
                  project-specific checks still run in the original local course.
                </p>
              </div>
            )}

            <div className="step-continue native-complete">
              {isGraded && !complete && (
                <label className="native-attest">
                  <input type="checkbox" checked={attested}
                    onChange={(event) => setAttested(event.target.checked)} />
                  I ran the verification command locally and saw a passing result.
                </label>
              )}
              <button type="button" className="button primary" disabled={complete || (isGraded && !attested)}
                onClick={completeActivity}>
                {complete ? <><Check size={17} /> Completed</>
                  : isGraded ? <><Check size={17} /> Mark verified locally</>
                  : <>Mark activity complete <Check size={17} /></>}
              </button>
              {next && <Link className="button quiet" href={lessonPath(next.item.id)}>
                Next activity <ArrowRight size={17} />
              </Link>}
            </div>
            <p className="notice" role="status">{message}</p>
          </section>
          <nav className="pager" aria-label={upstream.name + " lessons"}>
            {previous ? (
              <Link href={lessonPath(previous.item.id)}>
                <ArrowLeft size={16} /> {previous.item.title}
              </Link>
            ) : <span />}
            {next ? (
              <Link href={lessonPath(next.item.id)}>
                {next.item.title} <ArrowRight size={16} />
              </Link>
            ) : <Link href={"/learn/" + courseId}>Back to course</Link>}
          </nav>
        </div>
      </div>
    </div>
  );
}
