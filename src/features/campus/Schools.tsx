"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { coursePath } from "../../lib/courses";
import { lessonPath } from "../../lib/course";
import { courseCompletion, type CourseOverview, type ProgressSnapshot } from "../../lib/courseDirectory";
import type { School } from "../../lib/campus";
import { onProgress, read } from "../progress/store";

export type SchoolView = School & {
  summaries: CourseOverview[];
  highlightItems: { id: string; title: string; why: string }[];
};

// The student journey every campus page serves, in order.
export const journey = [
  ["Discover", "/schools"],
  ["Learn", "/learn"],
  ["Practice", "/playground"],
  ["Build", "/studio"],
  ["Review & contribute", "/community"],
  ["Advance", "/progress"],
] as const;

export function JourneyNav({ here }: { here: string }) {
  return (
    <nav className="campus-journey" aria-label="Learning journey">
      <ol>
        {journey.map(([label, href]) => (
          <li key={href}>
            <Link href={href} aria-current={href === here ? "page" : undefined}>{label}</Link>
          </li>
        ))}
      </ol>
    </nav>
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
    <div className="campus shell page-pad">
      <header className="campus-hero">
        <p className="eyebrow">Swarm Campus · Schools</p>
        <h1 className="display small">Pick a discipline, then <em>build in it.</em></h1>
        <p className="lede">
          Each school groups existing courses around one kind of engineering. Courses keep their own
          progress; a school shows where you are across them and what to do next.
        </p>
        <JourneyNav here="/schools" />
      </header>
      {schools.map((school) => {
        const rows = school.summaries.map((summary) => ({ summary, completion: courseCompletion(summary, progress) }));
        const activities = rows.reduce((n, r) => n + r.summary.items.length, 0);
        const checks = rows.reduce((n, r) => n + r.summary.checks, 0);
        const done = rows.reduce((n, r) => n + r.completion.completed, 0);
        // Next step: continue the first started course, else open the first unfinished one.
        const started = rows.find((r) => r.completion.resumeId && r.completion.completed < r.completion.total);
        const next = started ?? rows.find((r) => r.completion.completed < r.completion.total);
        const nextHref = next ? (next.completion.resumeId ? lessonPath(next.completion.resumeId) : coursePath(next.summary.course.id)) : null;
        return (
          <section key={school.id} id={school.id} className="school" aria-labelledby={"school-" + school.id}>
            <div className="school-head">
              <div>
                <h2 id={"school-" + school.id}>{school.title}</h2>
                <p className="school-focus">{school.focus}</p>
              </div>
              <p className="school-facts" data-testid={"school-facts-" + school.id}>
                <span><b>{rows.length}</b> {rows.length === 1 ? "course" : "courses"}</span>
                <span><b>{activities}</b> activities</span>
                <span><b>{checks}</b> graded checks</span>
                <span><b>{done}</b> completed</span>
              </p>
            </div>
            <div className="school-body">
              <div>
                <h3>What you will learn</h3>
                <ul className="school-learn">{school.learn.map((l) => <li key={l}>{l}</li>)}</ul>
                <h3>Before you start</h3>
                <p>{school.start}</p>
                {nextHref && next && (
                  <Link className="button primary" href={nextHref}>
                    {next.completion.resumeId ? "Continue " : "Start "}{next.summary.course.title} <ArrowRight size={16} />
                  </Link>
                )}
              </div>
              <div>
                <h3>Courses</h3>
                <ul className="school-courses">
                  {rows.map(({ summary, completion }) => (
                    <li key={summary.course.id}>
                      <Link href={coursePath(summary.course.id)}>{summary.course.title}</Link>
                      <span className="school-course-meta">{summary.course.language}</span>
                      <span className="school-course-progress">{completion.completed} of {completion.total} completed</span>
                    </li>
                  ))}
                </ul>
                {school.highlightItems.length > 0 && <>
                  <h3>From the Python course</h3>
                  <ul className="school-highlights">
                    {school.highlightItems.map((h) => (
                      <li key={h.id}><Link href={lessonPath(h.id)}>{h.title}</Link><span>{h.why}</span></li>
                    ))}
                  </ul>
                </>}
              </div>
            </div>
          </section>
        );
      })}
      <p className="campus-note">
        More schools will appear only when their courses exist. Swarm Campus is a working name for
        this open learning project; it is not an accredited institution and awards no degrees.
      </p>
    </div>
  );
}
