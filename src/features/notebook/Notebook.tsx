"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  courseRepo,
  lessonPath,
  notebookData,
  type Catalog,
  type CodeCell,
  type Notebook,
} from "../../lib/course";
import {
  doneIn,
  graduatedKeys,
  mark,
  read,
  save,
  setLast,
} from "../progress/store";
import { Runner } from "../../workers/runner";
import { CodeEditor } from "../../components/CodeEditor";
import { ProgressMeter } from "../../components/ProgressMeter";
type Output = { name: string; text: string };
function forCell(c: CodeCell) {
  if (c.kind === "quiz")
    return Array.from(
      c.source.matchAll(/quiz\.answer\((\d+),/g),
      (m) => "q" + m[1],
    );
  const m =
    c.kind === "exercise"
      ? c.source.match(/check\((\d+),/)
      : c.kind === "check"
        ? c.source.match(/check\('([^']+)'\)/)
        : null;
  return m ? [(c.kind === "exercise" ? "ex" : "wb:") + m[1]] : [];
}
export function Lesson({ id, catalog }: { id: string; catalog: Catalog }) {
  const [nb, setNb] = useState<Notebook>(),
    [error, setError] = useState("");
  useEffect(() => {
    const ctl = new AbortController();
    notebookData(id, ctl.signal)
      .then((n) => {
        if (!ctl.signal.aborted) {
          setLast(id);
          setNb(n);
        }
      })
      .catch((e) => {
        if (!ctl.signal.aborted) setError(String(e));
      });
    return () => ctl.abort();
  }, [id]);
  return nb ? (
    <Workspace nb={nb} catalog={catalog} />
  ) : (
    <p role="status">
      {error || "Loading notebook…"} <Link href="/curriculum">Curriculum</Link>
    </p>
  );
}
function Workspace({ nb, catalog }: { nb: Notebook; catalog: Catalog }) {
  const [status, setStatus] = useState("Loading Python…"),
    [edits, edit] = useState(() => read().code?.[nb.id] ?? {}),
    [outputs, output] = useState<Record<string, Output[]>>({}),
    [busy, setBusy] = useState<string | null>(null),
    [batch, setBatch] = useState(false);
  const runner = useRef<Runner | null>(null),
    running = useRef(false),
    article = useRef<HTMLElement>(null);
  const [outline, setOutline] = useState<{ id: string; title: string }[]>([]),
    [active, setActive] = useState("");
  useEffect(() => {
    runner.current = new Runner(setStatus);
    document.title = nb.title + " · SwarmLadder Lab";
    return () => {
      runner.current?.dispose();
      runner.current = null;
      document.title = "SwarmLadder Lab";
    };
  }, [nb]);
  useEffect(() => {
    const headings = [
      ...article.current!.querySelectorAll(".md h2,.md h3"),
    ].slice(0, 25);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    setOutline(
      headings.map((h, i) => {
        h.id ||= "lesson-section-" + i;
        observer.observe(h);
        return { id: h.id, title: h.textContent || "" };
      }),
    );
    if (location.hash)
      document
        .getElementById(decodeURIComponent(location.hash.slice(1)))
        ?.scrollIntoView();
    return () => observer.disconnect();
  }, [nb]);
  function change(c: CodeCell, v?: string) {
    save(nb.id, c.id, v);
    edit((old) => ({ ...old, [c.id]: v ?? c.source }));
  }
  function append(id: string, name: string, text: string) {
    output((o) => ({ ...o, [id]: [...(o[id] ?? []), { name, text }] }));
  }
  async function execute(cells: CodeCell[], all = false) {
    const session = runner.current;
    if (!session || running.current) return;
    running.current = true;
    setBatch(all);
    try {
      for (const c of cells) {
        setBusy(c.id);
        output((o) => ({ ...o, [c.id]: [] }));
        let text = "";
        const code = read().code?.[nb.id]?.[c.id] ?? c.source;
        const result = await session.run(
          code,
          "/course/" + nb.folder,
          (name, chunk) => {
            text += chunk;
            append(c.id, name, chunk);
          },
        );
        if (session !== runner.current) return;
        if (result.error)
          append(
            c.id,
            "stderr",
            [
              result.friendly,
              (!result.friendly || !code.includes("___")) && result.error,
            ]
              .filter(Boolean)
              .join("\n"),
          );
        const keys = graduatedKeys(text);
        if (keys.length) mark(nb.id, keys);
        if (result.stopped) break;
      }
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
    runner.current = new Runner(setStatus);
    setStatus("Loading Python…");
    if (clear) output({});
    else if (busy)
      append(busy, "stderr", "Stopped. Run the cells above again.");
    running.current = false;
    setBusy(null);
    setBatch(false);
  }
  const level = catalog.levels.find((l) => nb.id.startsWith(l.id + "/"));
  const items = level?.sections.flatMap((s) => s.items) ?? [];
  const pos = items.findIndex((i) => i.id === nb.id);
  const done = doneIn(nb.id);
  return (
    <>
      <p>
        <Link href="/curriculum">Python curriculum</Link> / {level?.title}
      </p>
      <h1>{nb.title}</h1>
      <div className="workspace">
        <aside className="panel outline">
          <h2>Lesson outline</h2>
          <ProgressMeter
            value={nb.graded.filter((k) => done.includes(k)).length}
            total={nb.graded.length}
          />
          {outline.map((h) => (
            <a
              key={h.id}
              aria-current={active === h.id ? "location" : undefined}
              href={"#" + h.id}
            >
              {h.title}
            </a>
          ))}
        </aside>
        <article ref={article}>
          <div className="toolbar">
            <button
              disabled={!!busy}
              onClick={() =>
                execute(
                  nb.cells.filter((c) => c.type === "code"),
                  true,
                )
              }
            >
              {batch ? "Running all…" : "Run All"}
            </button>
            <button onClick={() => restart(false)}>Stop</button>
            <button onClick={() => restart(true)}>Restart</button>
            <small role="status">{status}</small>
          </div>
          <p className="sources">
            <a href={courseRepo + "/blob/main/" + nb.id + ".ipynb"}>GitHub ↗</a>{" "}
            ·{" "}
            <a
              href={
                "https://colab.research.google.com/github/SwarmLadder/python-notebook/blob/main/" +
                nb.id +
                ".ipynb"
              }
            >
              Colab ↗
            </a>
          </p>
          {nb.cells.map((c, i) => {
            if (c.type === "md")
              return (
                <section
                  className="md"
                  key={i}
                  dangerouslySetInnerHTML={{
                    __html: c.html,
                  }}
                />
              );
            const keys = forCell(c);
            return (
              <section
                className={"code-cell panel " + (busy === c.id ? "busy" : "")}
                key={c.id}
              >
                <div className="cell-tools">
                  <strong>
                    {c.kind === "code" ? "Python" : c.kind}
                    {keys.length > 0 && keys.every((k) => done.includes(k))
                      ? " ✓"
                      : ""}
                  </strong>
                  <div>
                    <button
                      onClick={() => {
                        if (
                          (edits[c.id] ?? c.source) === c.source ||
                          confirm(
                            "Replace your code in this cell with the original?",
                          )
                        )
                          change(c);
                      }}
                    >
                      Reset
                    </button>
                    <button
                      className="run"
                      disabled={!!busy}
                      onClick={() => execute([c])}
                    >
                      Run
                    </button>
                  </div>
                </div>
                <CodeEditor
                  value={edits[c.id] ?? c.source}
                  onChange={(v) => change(c, v)}
                  onRun={() => execute([c])}
                />
                <small>Output</small>
                <pre className="output" aria-live="polite">
                  {outputs[c.id]?.map((o, i) => (
                    <span key={i} className={o.name}>
                      {o.text}
                    </span>
                  ))}
                </pre>
              </section>
            );
          })}
          <nav className="pager">
            {pos > 0 && (
              <Link href={lessonPath(items[pos - 1].id)}>
                ← {items[pos - 1].title}
              </Link>
            )}
            <Link href="/curriculum">All lessons</Link>
            {pos >= 0 && pos < items.length - 1 && (
              <Link href={lessonPath(items[pos + 1].id)}>
                {items[pos + 1].title} →
              </Link>
            )}
          </nav>
        </article>
      </div>
    </>
  );
}
