"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Layers3,
  NotebookPen,
  Search,
  Signal,
  Terminal,
} from "lucide-react";
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
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [level, setLevel] = useState("all");
  const levels = catalog.levels;
  const all = levels.flatMap((l) => l.sections.flatMap((s) => s.items));
  const last = all.find((i) => i.id === read().last);
  const next = last ?? all[0];
  const total = levels.reduce((n, l) => n + l.total, 0);
  const options = new Map(
    levels.flatMap((l) => l.sections.map((s) => [s.id, s.title] as const)),
  );
  const groups = levels
    .filter((l) => level === "all" || l.id === level)
    .map((l) => ({
      ...l,
      sections: l.sections
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
    .filter((l) => l.sections.length);
  const matches = groups.reduce(
    (n, l) => n + l.sections.reduce((n, s) => n + s.items.length, 0),
    0,
  );
  return (
    <div className="catalog-page">
      <section className="catalog-banner">
        <div>
          <p className="banner-meta">
            <BookOpen size={16} /> Course library
          </p>
          <h1>Python curriculum</h1>
          <p>
            {all.length} notebooks <span>·</span> {levels.length} levels{" "}
            <span>·</span> {total} checks
          </p>
          {next && (
            <Link className="cta" href={lessonPath(next.id)}>
              {last ? "Continue learning" : "Start learning"}{" "}
              <ArrowRight size={17} />
            </Link>
          )}
        </div>
        <div className="catalog-progress">
          <p>Your progress</p>
          <strong>
            {Math.round((100 * count(all)) / (total || 1))}
            <small>%</small>
          </strong>
          <progress
            aria-label="Course progress"
            max={total || 1}
            value={count(all)}
          />
          <span>
            {count(all)} of {total} checks completed
          </span>
        </div>
      </section>
      <div className="catalog-layout">
        <aside className="catalog-rail">
          <h2>Course levels</h2>
          <div className="level-choices">
            {[
              { id: "all", title: "All levels", size: all.length },
              ...levels.map((l) => ({
                id: l.id,
                title: l.title,
                size: l.sections.reduce((n, s) => n + s.items.length, 0),
              })),
            ].map((l, i) => (
              <button
                key={l.id}
                aria-pressed={level === l.id}
                onClick={() => setLevel(l.id)}
              >
                {i === 0 ? <Layers3 size={17} /> : <Signal size={17} />}
                <span>{l.title}</span>
                <small>{l.size}</small>
              </button>
            ))}
          </div>
          <Link className="rail-play" href="/playground">
            <Terminal size={18} /> Python playground <ArrowRight size={15} />
          </Link>
        </aside>
        <section className="catalog-results">
          <div className="library-tools">
            <label className="catalog-search">
              <Search size={17} />
              <input
                type="search"
                aria-label="Search notebooks"
                placeholder="Search notebooks…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Content"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All content</option>
              {[...options].map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>
          <p className="result-count" role="status">
            {matches} matching notebooks
          </p>
          {groups.map((l) => (
            <div className="track-list" key={l.id}>
              <div className="track-title">
                <h2>{l.title}</h2>
                <span>
                  {count(l.sections.flatMap((s) => s.items))} completed checks
                  {filter !== "all" || query ? " in results" : ""}
                </span>
              </div>
              {l.sections.map((s, idx) => (
                <details
                  className="section-list"
                  key={[s.id, query, filter, level].join(":")}
                  open={
                    !!query ||
                    filter !== "all" ||
                    (idx === 0 && (level !== "all" || l.id === groups[0].id))
                  }
                >
                  <summary>
                    <span className="section-symbol">
                      {s.id === "notebooks" ? (
                        <BookOpen />
                      ) : s.id === "exercises" ? (
                        <NotebookPen />
                      ) : (
                        <Code2 />
                      )}
                    </span>
                    {s.title}
                    <small>{s.items.length}</small>
                    <ChevronRight className="disclosure" size={16} />
                  </summary>
                  <div>
                    {s.items.map((item) => {
                      const completed = Math.min(
                        doneIn(item.id).length,
                        item.graded,
                      );
                      const done = !!item.graded && completed === item.graded;
                      return (
                        <Link
                          className="catalog-row"
                          href={lessonPath(item.id)}
                          key={item.id}
                        >
                          <span
                            className={"row-state" + (done ? " finished" : "")}
                          >
                            {done ? <Check size={13} /> : <span />}
                          </span>
                          <span>{item.title}</span>
                          <small>
                            {item.graded
                              ? completed + " / " + item.graded
                              : "Practice"}
                          </small>
                          <ChevronRight size={15} />
                        </Link>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          ))}
          {!matches && (
            <div className="empty-results">
              <Search />
              <h2>No matching notebooks</h2>
              <button
                onClick={() => {
                  setQuery("");
                  setLevel("all");
                  setFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
