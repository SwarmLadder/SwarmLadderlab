"use client";
import { useState } from "react";
import Link from "next/link";
import { lessonPath, type Catalog, type Item } from "../../lib/course";
import { doneIn, read } from "../progress/store";
import { ProgressMeter } from "../../components/ProgressMeter";

const count = (items: Item[]) =>
  items.reduce((n, i) => n + Math.min(i.graded, doneIn(i.id).length), 0);
export function Dashboard({ catalog }: { catalog: Catalog }) {
  const items = catalog.levels.flatMap((l) =>
    l.sections.flatMap((s) => s.items),
  );
  const last = items.find((i) => i.id === read().last);
  const next = last || items[0];
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">SwarmLadder Lab</p>
          <h1>
            Learn Together.
            <br />
            <em>Rise Together.</em>
          </h1>
          <p>
            Build your Python skills with interactive lessons, workbooks, and
            projects in your browser.
          </p>
          {next && (
            <Link className="cta" href={lessonPath(next.id)}>
              {last ? "Continue learning" : "Start learning"} →
            </Link>
          )}
        </div>
        <aside>
          <h2>Your learning progress</h2>
          <ProgressMeter
            value={count(items)}
            total={catalog.levels.reduce((n, l) => n + l.total, 0)}
          />
          {last && (
            <p>
              Last notebook
              <br />
              <strong>{last.title}</strong>
            </p>
          )}
        </aside>
      </section>
      <section>
        <h2>Course tracks</h2>
        <article className="panel course">
          <div>
            <p className="eyebrow">Interactive course</p>
            <h3>Python</h3>
            <p>
              {items.length} notebooks · {catalog.levels.length} learning levels
            </p>
          </div>
          <Link href="/curriculum">Explore curriculum →</Link>
        </article>
        <p className="muted">Coming soon · SQL, Git, Linux, DSA, and Rust</p>
      </section>
    </>
  );
}
export function Curriculum({ catalog }: { catalog: Catalog }) {
  const [query, q] = useState(""),
    [filter, f] = useState("all"),
    [level, l] = useState("all");
  const groups = catalog.levels
    .filter((v) => level === "all" || v.id === level)
    .map((v) => ({
      ...v,
      sections: v.sections
        .filter((s) => filter === "all" || filter === s.id)
        .map((s) => ({
          ...s,
          items: s.items.filter((i) =>
            (i.title + " " + i.id)
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
          ),
        }))
        .filter((s) => s.items.length),
    }))
    .filter((v) => v.sections.length);
  return (
    <>
      <p className="eyebrow">Python course</p>
      <h1>Curriculum</h1>
      <div className="filters">
        <label>
          Search notebooks
          <input
            type="search"
            value={query}
            onChange={(e) => q(e.target.value)}
            placeholder="Search by title or topic"
          />
        </label>
        <label>
          Level
          <select value={level} onChange={(e) => l(e.target.value)}>
            <option value="all">All levels</option>
            {catalog.levels.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Content
          <select value={filter} onChange={(e) => f(e.target.value)}>
            <option value="all">All content</option>
            {[
              ...new Map(
                catalog.levels
                  .flatMap((v) => v.sections)
                  .map((s) => [s.id, s.title]),
              ).entries(),
            ].map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">
        {groups.reduce(
          (n, v) => n + v.sections.reduce((a, s) => a + s.items.length, 0),
          0,
        )}{" "}
        matching notebooks
      </p>
      <div className="cards">
        {groups.map((v) => (
          <article key={v.id} className="panel">
            <h2>{v.title}</h2>
            <ProgressMeter
              value={count(
                catalog.levels
                  .find((i) => i.id === v.id)!
                  .sections.flatMap((s) => s.items),
              )}
              total={v.total}
            />
            {v.sections.map((s) => (
              <details
                key={s.id}
                open={!!query || filter !== "all" || s.id === "notebooks"}
              >
                <summary>
                  {s.title} <small>({s.items.length})</small>
                </summary>
                {s.items.map((i) => (
                  <Link
                    className="lesson-link"
                    key={i.id}
                    href={lessonPath(i.id)}
                  >
                    {i.title}
                    <small>
                      {i.graded
                        ? Math.min(doneIn(i.id).length, i.graded) +
                          " / " +
                          i.graded +
                          " checks"
                        : "Practice notebook"}
                    </small>
                  </Link>
                ))}
              </details>
            ))}
          </article>
        ))}
      </div>
      {!groups.length && <p>Try another keyword or content filter.</p>}
    </>
  );
}
