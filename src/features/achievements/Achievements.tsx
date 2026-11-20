"use client";
import { useState } from "react";
import Link from "next/link";
import {
  courseRepo,
  download,
  lessonPath,
  notebookData,
  type Catalog,
} from "../../lib/course";
import { doneIn, read } from "../progress/store";
import { ProgressMeter } from "../../components/ProgressMeter";
async function solutions(id: string, module: string) {
  const nb = await notebookData(id);
  const parts = [
    `# My solutions for ${module}, written on SwarmLadderlab.`,
    "",
  ];
  for (const c of nb.cells) {
    if (c.type !== "code" || c.kind === "check") continue;
    let source = read().code?.[id]?.[c.id] ?? c.source;
    if (c.kind === "setup")
      source = source
        .split("\n")
        .filter(
          (l) =>
            !l.startsWith("from check import") &&
            !l.startsWith("check = Checker("),
        )
        .join("\n")
        .trim();
    if (source) parts.push(source, "");
  }
  download(
    module + ".py",
    parts.join("\n").replace(/\n{3,}/g, "\n\n"),
    "text/x-python",
  );
}
export function Achievements({ catalog }: { catalog: Catalog }) {
  const [login, setLogin] = useState(
      localStorage.getItem("swarmladderlab.login") || "",
    ),
    [error, setError] = useState("");
  return (
    <>
      <h1>Achievements</h1>
      <p>
        Pass every workbook check in a level, then submit your solutions for
        verification.
      </p>
      <label>
        GitHub username
        <input
          autoComplete="username"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
      </label>
      <p role="alert">{error}</p>
      <div className="cards">
        {catalog.levels.map((l) => {
          const books = Object.entries(catalog.workbooks)
            .filter(([, w]) => w.level === l.id)
            .map(([id, w]) => ({
              ...w,
              id,
              missing: w.exercises.filter(
                (x) => !doneIn(id).includes("wb:" + x),
              ),
            }));
          const total = books.reduce((n, w) => n + w.exercises.length, 0),
            remaining = books.reduce((n, w) => n + w.missing.length, 0);
          return (
            <article className="panel" key={l.id}>
              <h2>
                {l.medal} {l.title}
              </h2>
              <ProgressMeter
                value={total - remaining}
                total={total}
                label="Workbook checks passed"
              />
              {books.map((w) => (
                <Link
                  key={w.id}
                  className="lesson-link"
                  href={lessonPath(w.id)}
                >
                  {l.sections.flatMap((s) => s.items).find((i) => i.id === w.id)
                    ?.title ?? w.module}
                  <small>
                    {w.missing.length
                      ? `${w.exercises.length - w.missing.length}/${w.exercises.length} · Next: ${w.missing[0]}`
                      : "All checks passed"}
                  </small>
                </Link>
              ))}
              {remaining || !total ? (
                <p>Finish every workbook of this level to unlock your claim.</p>
              ) : (
                <ol>
                  <li>
                    <a href={courseRepo + "/fork"}>Fork the course on GitHub</a>
                    .
                  </li>
                  <li>
                    Upload these solutions to <code>practice/exercises/</code>{" "}
                    in your fork.
                    {books.map((w) => (
                      <button
                        key={w.id}
                        onClick={() =>
                          solutions(w.id, w.module).catch((e) =>
                            setError(String(e)),
                          )
                        }
                      >
                        {w.module}.py
                      </button>
                    ))}
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        const name = login.trim();
                        if (!/^[A-Za-z0-9-]{1,39}$/.test(name)) {
                          setError("Enter your GitHub username first.");
                          return;
                        }
                        localStorage.setItem("swarmladderlab.login", name);
                        window.open(
                          "https://github.com/" +
                            name +
                            "/python-notebook/new/main?" +
                            new URLSearchParams({
                              filename: "achievements/claims/" + name + ".md",
                              value:
                                "level: " + l.id + "\nname: " + name + "\n",
                            }),
                          "_blank",
                          "noopener",
                        );
                      }}
                    >
                      Create your claim file
                    </button>{" "}
                    and open a pull request to the course.
                  </li>
                  <li>
                    The Verify achievement check runs your code before
                    maintainer approval.
                  </li>
                </ol>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
