"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Code2, Database, GitBranch, Search, Terminal, SquareTerminal, Workflow, Cpu, Wrench } from "lucide-react";
import { coursePath } from "../../lib/courses";
import { lessonPath } from "../../lib/course";
import { courseCompletion, type CourseOverview, type ProgressSnapshot } from "../../lib/courseDirectory";
import { onProgress, read } from "../progress/store";

type Filter = "all" | "open" | "soon";
const symbols = { python: Code2, sql: Database, git: GitBranch, rust: Terminal, linux: SquareTerminal, dsa: Workflow, c: Cpu } as const;

export function CourseLibrary({ summaries }: { summaries: CourseOverview[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [progress, setProgress] = useState<ProgressSnapshot>({});
  useEffect(() => {
    const sync = () => setProgress(read());
    sync();
    return onProgress(sync);
  }, []);
  const filtered = useMemo(() => summaries.filter(({ course }) =>
    (filter === "all" || course.status === filter) &&
    [course.title, course.language, course.blurb].join(" ").toLowerCase().includes(query.trim().toLowerCase())
  ), [summaries, query, filter]);
  const openCourses = summaries.filter(({ course }) => course.status === "open");
  const activityCount = openCourses.reduce((n, summary) => n + summary.items.length, 0);

  return (
    <div className="course-library shell page-pad">
      <header className="library-hero">
        <div>
          <p className="eyebrow">THE SWARMLADDER CURRICULUM</p>
          <h1 className="display small">Choose what you&apos;ll <em>build next.</em></h1>
          <p className="lede">Guided paths, real projects and interview-ready practice. Explore a course and track each subject independently.</p>
          <p className="library-totals">{openCourses.length} available courses · {activityCount} activities · Free to learn</p>
        </div>
        <aside className="library-feature" aria-label="Featured SQL course">
          <span className="library-feature-tag"><Database size={15} /> FEATURED COURSE</span>
          <h2>SQL, from your first query to backend data.</h2>
          <p>Write SQLite in your browser. Test queries against realistic datasets without setting up a database server.</p>
          <div className="library-feature-links">
            <Link href="/learn/sql">Explore SQL <ArrowRight size={15}/></Link>
            <Link href={lessonPath("sql/basics/lessons/00_select")}>Try a SQL lesson <ArrowRight size={15}/></Link>
          </div>
        </aside>
      </header>
      <div className="library-toolbar">
        <label className="library-search">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Search courses</span>
          <input aria-label="Search courses" type="search" value={query}
            placeholder="Search courses and languages…" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="library-filters" role="group" aria-label="Course availability">
          {([["all","All courses"],["open","Available now"],["soon","Coming soon"]] as [Filter,string][]).map(([id,label]) =>
            <button key={id} type="button" className={"library-filter" + (filter === id ? " active" : "")}
              aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
        </div>
      </div>
      <p className="library-results" role="status" aria-live="polite">{filtered.length} course{filtered.length === 1 ? "" : "s"} found</p>
      <div className="library-grid">
        {filtered.map((summary) => {
          const { course, items, levels, checks } = summary;
          const completion = courseCompletion(summary, progress);
          const Icon = symbols[course.id as keyof typeof symbols] ?? Wrench;
          const open = course.status === "open";
          const href = completion.resumeId ? lessonPath(completion.resumeId) : coursePath(course.id);
          return <article key={course.id} className={"library-card" + (open ? "" : " unavailable")}
            style={{ "--course-hue": course.hue } as CSSProperties}>
            <div className="library-card-top">
              <span className="library-course-icon"><Icon size={23} strokeWidth={1.8} aria-hidden="true"/></span>
              <span className={"library-availability " + (open ? "available" : "soon")}>
                {open ? "● Available" : "In preparation"}
              </span>
            </div>
            <p className="library-course-language">{course.language}</p>
            <h2>{course.title}</h2>
            <p className="library-card-blurb">{course.blurb}</p>
            {open ? <>
              <p className="library-card-facts"><span><BookOpen size={14}/> {items.length} activities</span><span>{levels} levels</span><span>{checks} checks</span></p>
              <div className="library-progress-copy"><span>{completion.completed} of {completion.total} completed</span><strong>{completion.percent}%</strong></div>
              <div className="library-progress-meter" role="progressbar" aria-label={course.title + " completion"}
                aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: completion.percent + "%" }} />
              </div>
              <Link className="library-card-link" href={href} aria-label={course.title + (completion.resumeId ? ", Continue learning" : ", Open now")}>{completion.resumeId ? "Continue learning" : "Explore course"} <ArrowRight size={17}/></Link>
            </> : <p className="library-card-upcoming">More learning material is on the way.</p>}
          </article>;
        })}
        {!filtered.length && <div className="library-empty">
          <Search size={28}/><h2>No matching courses</h2><p>Try another term or show all courses.</p>
          <button type="button" className="button quiet" onClick={() => { setFilter("all"); setQuery(""); }}>Show all courses</button>
        </div>}
      </div>
      <section className="library-bottom">
        <span><Check size={18}/></span>
        <div><h2>One platform, independent progress.</h2><p>Your lessons and saved code are kept separately for every course on this device. You can export or restore a backup at any time.</p></div>
        <Link href="/progress" className="button quiet">Manage progress <ArrowRight size={16}/></Link>
      </section>
    </div>
  );
}
