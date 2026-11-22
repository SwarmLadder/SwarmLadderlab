"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Map as MapIcon } from "lucide-react";
import { coursePath } from "../../lib/courses";
import { lessonPath } from "../../lib/course";
import { courseCompletion, type CourseOverview, type ProgressSnapshot } from "../../lib/courseDirectory";
import type { School } from "../../lib/campus";
import { TechLogo } from "../../components/TechLogo";
import { onProgress, read } from "../progress/store";

export type SchoolView = School & {
  summaries: CourseOverview[];
  highlightItems: { id: string; title: string; why: string }[];
  projects: { id: string; title: string; course: string }[];
};

// Original emblems: software as nested structure, systems as layers down to the
// machine, data as stored records flowing through a check.
export function SchoolEmblem({ id }: { id: string }) {
  return (
    <svg className={"school-emblem " + id} viewBox="0 0 64 64" aria-hidden="true" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      {id === "software" && <>
        <path d="M22 18 10 32l12 14M42 18l12 14-12 14" stroke="currentColor" />
        <circle cx="32" cy="22" r="3.5" fill="currentColor" stroke="none" />
        <path d="M32 26v8m0 0-6 7m6-7 6 7" stroke="currentColor" />
      </>}
      {id === "systems" && <>
        <rect x="12" y="12" width="40" height="9" rx="2" stroke="currentColor" />
        <rect x="16" y="27" width="32" height="9" rx="2" stroke="currentColor" />
        <rect x="20" y="42" width="24" height="10" rx="2" fill="currentColor" stroke="none" />
      </>}
      {id === "data" && <>
        <ellipse cx="26" cy="15" rx="13" ry="5" stroke="currentColor" />
        <path d="M13 15v26c0 2.8 5.8 5 13 5M39 15v12M13 28c0 2.8 5.8 5 13 5" stroke="currentColor" />
        <path d="M38 40l5 5 9-10" stroke="currentColor" strokeWidth="3.2" />
      </>}
    </svg>
  );
}

export function Schools({ schools }: { schools: SchoolView[] }) {
  const [progress, setProgress] = useState<ProgressSnapshot>({});
  useEffect(() => {
    const sync = () => setProgress(read());
    sync();
    return onProgress(sync);
  }, []);
  return (
    <div className="schools shell page-pad">
      <header className="schools-head">
        <p className="eyebrow">Schools</p>
        <h1 className="display small">Choose a discipline. Follow a path. <em>Build real skills.</em></h1>
        <nav className="schools-index" aria-label="Schools">
          {schools.map((s, i) => (
            <a key={s.id} href={"#" + s.id}><span>{String(i + 1).padStart(2, "0")}</span>{s.title}</a>
          ))}
        </nav>
      </header>

      {schools.map((school, index) => {
        const rows = school.summaries.map((summary) => ({ summary, completion: courseCompletion(summary, progress) }));
        const activities = rows.reduce((n, r) => n + r.summary.items.length, 0);
        const checks = rows.reduce((n, r) => n + r.summary.checks, 0);
        const done = rows.reduce((n, r) => n + r.completion.completed, 0);
        const started = rows.find((r) => r.completion.resumeId && r.completion.completed < r.completion.total);
        const next = started ?? rows.find((r) => r.completion.completed < r.completion.total);
        const nextHref = next ? (next.completion.resumeId ? lessonPath(next.completion.resumeId) : coursePath(next.summary.course.id)) : null;
        const pct = activities ? Math.round((100 * done) / activities) : 0;
        return (
          <section key={school.id} id={school.id} className={"school school-" + school.id} aria-labelledby={"school-" + school.id}>
            <div className="school-ident">
              <span className="school-index">{String(index + 1).padStart(2, "0")}</span>
              <SchoolEmblem id={school.id} />
              <h2 id={"school-" + school.id}>{school.title}</h2>
              <p className="school-focus">{school.focus}</p>
              <p className="school-leads"><b>Leads toward</b> {school.leadsTo}</p>
              <p className="school-start"><b>Start</b> {school.start}</p>
              {nextHref && next && (
                <Link className="button primary" href={nextHref}>
                  {next.completion.resumeId ? "Continue " : "Start "}{next.summary.course.title} <ArrowRight size={16} />
                </Link>
              )}
              <p className="school-facts" data-testid={"school-facts-" + school.id}>
                <span><b>{rows.length}</b> {rows.length === 1 ? "course" : "courses"}</span>
                <span><b>{activities}</b> activities</span>
                <span><b>{checks}</b> graded checks</span>
                <span><b>{done}</b> completed</span>
              </p>
              <div className="school-meter" role="progressbar" aria-label={school.title + " progress"} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: pct + "%" }} /></div>
            </div>

            <div className="school-curriculum">
              <h3>Curriculum</h3>
              <ol className="school-path">
                {rows.map(({ summary, completion }, i) => (
                  <li key={summary.course.id}>
                    <span className="school-step" aria-hidden="true">{i + 1}</span>
                    <TechLogo id={summary.course.id} size={26} />
                    <div>
                      <Link href={coursePath(summary.course.id)} className="school-course">{summary.course.title}</Link>
                      <span className="school-course-meta">{summary.course.language} · {completion.completed} of {completion.total} completed</span>
                    </div>
                    <Link href={`/learn/${summary.course.id}/roadmap`} className="school-roadmap" aria-label={summary.course.title + " roadmap"}><MapIcon size={16} /> Roadmap</Link>
                  </li>
                ))}
              </ol>

              <h3>What you will learn</h3>
              <ul className="school-learn">{school.learn.map((l) => <li key={l}>{l}</li>)}</ul>

              {(school.highlightItems.length > 0 || school.projects.length > 0) && (
                <>
                  <h3>{school.highlightItems.length ? "Python lessons and projects for this school" : "Projects you will build"}</h3>
                  <ul className="school-projects">
                    {school.highlightItems.map((h) => (
                      <li key={h.id}><Link href={lessonPath(h.id)}>{h.title}</Link><span>{h.why}</span></li>
                    ))}
                    {!school.highlightItems.length && school.projects.map((p) => (
                      <li key={p.id}><TechLogo id={p.course} size={16} /> <Link href={lessonPath(p.id)}>{p.title}</Link></li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        );
      })}
      <p className="campus-note">
        New schools open only when their courses exist. Swarm Campus is a working name for this open learning project;
        it is not an accredited institution and awards no degrees.
      </p>
    </div>
  );
}
