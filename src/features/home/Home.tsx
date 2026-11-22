"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { lessonPath, type Catalog } from "../../lib/course";
import { coursePath } from "../../lib/courses";
import { lessonNumber, route, type Route, type Stop } from "../../lib/journey";
import { onProgress, read } from "../progress/store";
import { LadderMark } from "../../components/Brand";
import { TechLogo } from "../../components/TechLogo";
import { courses as allCourses } from "../../lib/courses";
import type { Roadmap } from "../../lib/roadmap";
import { t } from "../../i18n";

function useRoute(catalog: Catalog): Route {
  const [r, setR] = useState(() => route(catalog));
  useEffect(() => onProgress(() => setR(route(catalog))), [catalog]);
  return r;
}

export type HomeFacts = { courses: number; activities: number; projects: number; schools: number; stages: number };
export function Home({ catalog, sqlCatalog, gitCatalog, rustCatalog, linuxCatalog, dsaCatalog, cCatalog, roadmap, facts }: {
  catalog: Catalog; sqlCatalog: Catalog; gitCatalog: Catalog; rustCatalog: Catalog; linuxCatalog: Catalog; dsaCatalog: Catalog; cCatalog: Catalog;
  roadmap: Roadmap; facts: HomeFacts;
}) {
  const python = useRoute(catalog);
  const sql = useRoute(sqlCatalog);
  const git = useRoute(gitCatalog);
  const rust = useRoute(rustCatalog);
  const linux = useRoute(linuxCatalog);
  const dsa = useRoute(dsaCatalog);
  const c = useRoute(cCatalog);
  const id = read().last?.split("/")[0] ?? "python";
  const selected = id === "sql" ? sql : id === "git" ? git : id === "rust" ? rust : id === "linux" ? linux : id === "dsa" ? dsa : id === "c" ? c : python;
  const r = selected;
  const returning = Boolean(read().last) || [python, sql, git, rust, linux, dsa, c].some((course) =>
    course.all.some((stop) => stop.done > 0 || stop.state === "done"));
  return (
    <div className="home">
      {returning && r.current ? (
        <>
          <Desk route={r} courseId={["sql", "git", "rust", "linux", "dsa", "c"].includes(id) ? id : "python"} />
          <CourseIndex />
        </>
      ) : (
        <>
          <Welcome route={r} />
          <Path facts={facts} />
          <CourseIndex />
          <RoadmapPreview roadmap={roadmap} />
          <Close route={r} />
        </>
      )}
    </div>
  );
}

function Welcome({ route: r }: { route: Route }) {
  const first = r.all[0];
  return (
    <section className="hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <h1 className="display hero-title">
            {t("home.title.a")} <em>{t("home.title.b")}</em>
          </h1>
          <p className="lede">{t("home.lede")}</p>
          <div className="hero-actions">
            {first && (
              <Link className="button primary large" href={lessonPath(first.item.id)}>
                {t("home.begin")} <ArrowRight size={18} strokeWidth={1.8} />
              </Link>
            )}
            <Link className="button quiet large" href="/schools">Explore the schools</Link>
          </div>
        </div>
        <Plate />
      </div>
    </section>
  );
}

// An annotated plate, like a figure in a field guide: a real exercise being solved.
function Plate() {
  return (
    <figure className="plate" aria-label={t("home.plate.prompt")}>
      <div className="plate-sheet plate-back-2" aria-hidden="true" />
      <div className="plate-sheet plate-back-1" aria-hidden="true" />
      <div className="plate-sheet plate-front" aria-hidden="true">
        <div className="plate-bar">
          <span>{t("home.plate.crumb")}</span>
          <span className="plate-step">{t("home.plate.step")}</span>
        </div>
        <div className="plate-track"><span /></div>
        <p className="plate-prompt">{t("home.plate.prompt")}</p>
        <div className="plate-code">
          <ol className="plate-gutter"><li>1</li><li>2</li><li>3</li><li>4</li></ol>
          <pre>
            <span className="k">total</span> = <span className="n">0</span>
            {"\n"}
            <span className="k">for</span> n <span className="k">in</span> <span className="f">range</span>(<span className="n">1</span>, <span className="blank"><span className="blank-line">___</span><span className="blank-type">101</span><span className="caret" /></span>):
            {"\n"}
            {"    "}total += n
            {"\n"}<span className="f">check</span>(<span className="n">1</span>, total)
          </pre>
          <span className="plate-run">▶ {t("home.plate.run")}</span>
        </div>
        <div className="plate-out">
          <span className="stamp">✓</span>
          <code>Exercise 1: correct</code>
        </div>
      </div>
      <figcaption className="plate-notes">
        <span className="note note-1">
          <svg viewBox="0 0 80 60" aria-hidden="true"><path d="M8 56 C 10 32, 24 14, 52 8" /><path d="M42 2 L53 8 L45 17" /></svg>
          {t("home.plate.note1")}
        </span>
        <span className="note note-2">
          <svg viewBox="0 0 80 60" aria-hidden="true"><path d="M72 56 C 70 32, 56 14, 28 8" /><path d="M38 2 L27 8 L35 17" /></svg>
          {t("home.plate.note2")}
        </span>
      </figcaption>
    </figure>
  );
}

// The campus journey, each step a real place in the product with real numbers.
function Path({ facts }: { facts: HomeFacts }) {
  const steps: [string, string, string, string][] = [
    ["Explore a discipline", `${facts.schools} schools group the courses by kind of engineering.`, "/schools", "Schools"],
    ["Follow a roadmap", `The Python roadmap has ${facts.stages} stages, from first values to production.`, "/learn/python/roadmap", "Python roadmap"],
    ["Learn and practise", `${facts.activities} activities across ${facts.courses} courses, checked as you write.`, "/learn", "Courses"],
    ["Build real projects", `${facts.projects} engineering projects with briefs and acceptance criteria.`, "/studio", "Studio"],
    ["Collaborate", "Ask, contribute and review code on GitHub, in the open.", "/community", "Community"],
  ];
  return (
    <section className="path" aria-labelledby="path-title">
      <div className="shell">
        <h2 id="path-title" className="path-title">From first program to real engineering</h2>
        <ol className="path-steps">
          {steps.map(([title, text, href, label], i) => (
            <li key={href}>
              <span className="path-n">{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link href={href}>{label} <ArrowRight size={14} /></Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CourseIndex() {
  const open = allCourses.filter((c) => c.status === "open");
  return (
    <section className="course-index" aria-labelledby="ci-title" id="courses">
      <div className="shell">
        <div className="course-index-head">
          <h2 id="ci-title">Courses</h2>
          <Link href="/learn">All courses <ArrowRight size={14} /></Link>
        </div>
        <ul className="course-index-grid">
          {open.map((c) => (
            <li key={c.id}>
              <Link href={coursePath(c.id)}>
                <TechLogo id={c.id} size={28} />
                <span><b>{c.title}</b><small>{c.language}</small></span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// A real roadmap, not an illustration: the Python course's stages by level.
function RoadmapPreview({ roadmap }: { roadmap: Roadmap }) {
  return (
    <section className="rm-preview" aria-labelledby="rmp-title">
      <div className="shell rm-preview-grid">
        <div>
          <h2 id="rmp-title">See the whole climb before you start.</h2>
          <p className="lede">Every course has a roadmap. Python&apos;s follows the curriculum&apos;s own concept map, so each stage shows what it builds on and how it is checked.</p>
          <Link className="button quiet" href="/learn/python/roadmap">Open the Python roadmap <ArrowRight size={16} /></Link>
        </div>
        <ol className="rm-preview-levels">
          {roadmap.levels.map((level) => (
            <li key={level.id}>
              <h3>{level.title}</h3>
              <ol>{level.stages.map((s) => <li key={s.id}><span className="rm-dot" aria-hidden="true" />{s.title}</li>)}</ol>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Close({ route: r }: { route: Route }) {
  const first = r.all[0];
  return (
    <section className="close">
      <div className="shell close-inner">
        <LadderMark size={44} />
        <h2>{t("home.close.title")}</h2>
        <p className="lede">{t("home.close.lede")}</p>
        {first && (
          <Link className="button primary large" href={lessonPath(first.item.id)}>
            {t("home.begin")} <ArrowRight size={18} strokeWidth={1.8} />
          </Link>
        )}
      </div>
    </section>
  );
}

function stopLabel(s: Stop) {
  const { number, name } = lessonNumber(s.item.title);
  return { number, name };
}

function Desk({ route: r, courseId }: { route: Route; courseId: string }) {
  const current = r.current!;
  const levelRoute = r.levels.find((l) => l.level.id === current.level.id)!;
  const upNext = r.all.slice(r.all.indexOf(current) + 1).filter((s) => s.state !== "done").slice(0, 2);
  const { number, name } = stopLabel(current);
  return (
    <section className="desk shell">
      <header>
        <p className="eyebrow">{t("brand.name")} · {current.level.title}</p>
        <h1 className="display small">{t("home.welcome")}</h1>
      </header>
      <div className="desk-grid">
        <Link className="continue-card" href={lessonPath(current.item.id)}>
          <span className="eyebrow">{t("home.continue")}</span>
          <span className="continue-title">
            {number && <span className="continue-number">{number}</span>}
            {name}
          </span>
          <span className="continue-meta">
            {current.total > 0 ? t("course.inProgress", { done: current.done, total: current.total }) + " " + t("course.checks", { n: "" }).trim() : t("course.youAreHere")}
          </span>
          <span className="continue-go" aria-hidden="true"><ArrowRight size={22} strokeWidth={1.6} /></span>
        </Link>
        <div className="desk-side">
          <p className="eyebrow">{t("home.ladder", { level: current.level.title })}</p>
          <ol className="rung-strip" aria-label={t("home.ladder", { level: current.level.title })}>
            {levelRoute.stops.map((s) => (
              <li key={s.item.id} className={s.state} title={s.item.title}>
                <span className="sr-only">{s.item.title}: {s.state}</span>
              </li>
            ))}
          </ol>
          <p className="desk-count">
            {levelRoute.stops.filter((s) => s.state === "done").length} / {levelRoute.stops.length}
          </p>
          {upNext.length > 0 && (
            <>
              <p className="eyebrow">{t("home.upNext")}</p>
              <ul className="up-next">
                {upNext.map((s) => (
                  <li key={s.item.id}>
                    <Link href={lessonPath(s.item.id)}>{lessonNumber(s.item.title).name}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link className="text-link" href={coursePath(courseId)}>{t("lesson.complete.route")} →</Link>
        </div>
      </div>
    </section>
  );
}
