"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { coursePath } from "../../lib/courses";
import { lessonPath } from "../../lib/course";
import { courseCompletion, type CourseOverview, type ProgressSnapshot } from "../../lib/courseDirectory";
import { TechLogo } from "../../components/TechLogo";
import { onProgress, read } from "../progress/store";

export type CourseEntry = { summary: CourseOverview; school: string | null; inside: { title: string; count: number }[] };
type Filter = "all" | string;

export function CourseLibrary({ entries, schools }: { entries: CourseEntry[]; schools: { id: string; title: string }[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [progress, setProgress] = useState<ProgressSnapshot>({});
  useEffect(() => {
    const sync = () => setProgress(read());
    sync();
    return onProgress(sync);
  }, []);
  const open = entries.filter((e) => e.summary.course.status === "open");
  const soon = entries.filter((e) => e.summary.course.status !== "open");
  const filtered = useMemo(() => open.filter(({ summary: { course }, school, inside }) =>
    (filter === "all" || school === filter) &&
    [course.title, course.language, course.blurb, ...inside.map((s) => s.title)].join(" ").toLowerCase()
      .includes(query.trim().toLowerCase())
  ), [open, query, filter]);
  const activities = open.reduce((n, e) => n + e.summary.items.length, 0);
  // The one course worth featuring is the one this learner is already taking.
  const resume = open.map((e) => ({ e, c: courseCompletion(e.summary, progress) }))
    .find(({ c }) => c.resumeId && c.completed < c.total);

  return (
    <div className="catalog shell page-pad">
      <header className="catalog-head">
        <div>
          <p className="eyebrow">Courses</p>
          <h1 className="display small">Choose what you&apos;ll <em>build next.</em></h1>
          <p className="catalog-facts">{open.length} courses · {activities} activities · free, no account</p>
        </div>
        {resume ? (
          <Link className="catalog-resume" href={lessonPath(resume.c.resumeId!)}>
            <TechLogo id={resume.e.summary.course.id} size={30} />
            <span><small>Continue</small>{resume.e.summary.course.title}<em>{resume.c.completed} of {resume.c.total} completed</em></span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        ) : (
          <Link className="catalog-resume" href="/learn/python">
            <TechLogo id="python" size={30} />
            <span><small>New here? Start with</small>Python Basics<em>No experience needed</em></span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
      </header>

      <div className="catalog-toolbar">
        <label className="library-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search courses</span>
          <input aria-label="Search courses" type="search" value={query}
            placeholder="Search courses, languages and topics" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="catalog-filters" role="group" aria-label="Filter by school">
          {[["all", "All schools"], ...schools.map((s) => [s.id, s.title.replace(" Engineering", "")])].map(([id, label]) =>
            <button key={id} type="button" className={"catalog-filter" + (filter === id ? " active" : "")}
              aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
      </div>
      <p className="library-results" role="status" aria-live="polite">{filtered.length} course{filtered.length === 1 ? "" : "s"} found</p>

      <div className="catalog-list">
        {filtered.map(({ summary, inside }) => {
          const { course, items, levels, checks } = summary;
          const completion = courseCompletion(summary, progress);
          const href = completion.resumeId ? lessonPath(completion.resumeId) : coursePath(course.id);
          return (
            <article key={course.id} className="library-card catalog-course">
              <div className="catalog-logo"><TechLogo id={course.id} size={34} /></div>
              <div className="catalog-main">
                <h2><Link href={coursePath(course.id)}>{course.title}</Link></h2>
                <p className="catalog-lang">{course.language}</p>
                <p className="catalog-blurb">{course.blurb}</p>
                <ul className="catalog-inside" aria-label={course.title + " contents"}>
                  {inside.slice(0, 4).map((s) => <li key={s.title}>{s.title}</li>)}
                </ul>
              </div>
              <div className="catalog-side">
                <p className="catalog-numbers"><span><b>{items.length}</b> activities</span><span><b>{checks}</b> checks</span><span><b>{levels}</b> {levels === 1 ? "level" : "levels"}</span></p>
                <div className="catalog-progress">
                  <span>{completion.completed} of {completion.total} completed</span>
                  <div className="library-progress-meter" role="progressbar" aria-label={course.title + " completion"}
                    aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: completion.percent + "%" }} />
                  </div>
                </div>
                <Link className="button quiet small" href={href}
                  aria-label={course.title + (completion.resumeId ? ", Continue learning" : ", Open now")}>
                  {completion.resumeId ? "Continue" : "Open course"} <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          );
        })}
        {!filtered.length && <div className="library-empty">
          <Search size={26} aria-hidden="true" /><h2>No matching courses</h2><p>Try another term or show all courses.</p>
          <button type="button" className="button quiet" onClick={() => { setFilter("all"); setQuery(""); }}>Show all courses</button>
        </div>}
      </div>

      {soon.length > 0 && (
        <section className="catalog-soon" aria-labelledby="catalog-soon">
          <h2 id="catalog-soon">In preparation</h2>
          <ul>{soon.map(({ summary: { course } }) => (
            <li key={course.id}><TechLogo id={course.id} size={22} /> <b>{course.title}</b> <span>{course.blurb}</span></li>
          ))}</ul>
        </section>
      )}
    </div>
  );
}
