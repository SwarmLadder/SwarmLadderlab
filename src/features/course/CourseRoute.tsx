"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Search } from "lucide-react";
import { lessonPath, type Catalog } from "../../lib/course";
import type { Course } from "../../lib/courses";
import { topic, lessonNumber, route, visibleWindow, type LevelRoute, type Route, type Stop, type StopKind } from "../../lib/journey";
import { onProgress, read } from "../progress/store";
import { t } from "../../i18n";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const KIND_LABEL: Record<StopKind, Parameters<typeof t>[0] | null> = {
  lesson: null,
  practice: "course.practice",
  example: "course.examples",
  build: "course.build",
};

export function CourseRoute({ catalog, course }: { catalog: Catalog; course: Course }) {
  const [r, setR] = useState<Route>(() => route(catalog));
  useEffect(() => onProgress(() => setR(route(catalog))), [catalog]);
  const [query, setQuery] = useState("");
  const total = r.levels.reduce((n, l) => n + l.total, 0);
  const done = r.levels.reduce((n, l) => n + l.done, 0);
  const lessons = r.all.length;
  const activeLevel = r.current?.level.id ?? r.levels.find((l) => !l.complete)?.level.id ?? r.levels[0]?.level.id;
  const started = r.all.some((stop) => stop.item.id === read().last) || done > 0;
  return (
    <div className="course shell">
      <header className="course-head">
        <div>
          <p className="eyebrow">{course.language}</p>
          <h1 className="display">{course.title}</h1>
          <p className="course-stats">
            <span>{t("course.lessons", { n: lessons })}</span>
            <span>{t("course.checks", { n: total })}</span>
            <span>{t("course.levels", { n: r.levels.length })}</span>
          </p>
        </div>
        <div className="course-actions">
          {r.current && (
            <Link className="button primary" href={lessonPath(r.current.item.id)}>
              {started ? t("course.resume") : t("course.start")} <ArrowRight size={18} strokeWidth={1.8} />
            </Link>
          )}
          <div className="course-progress" aria-label={`${done} / ${total}`}>
            <span className="course-progress-n">{total ? Math.round((100 * done) / total) : 0}%</span>
            <span className="thin-bar"><span style={{ width: `${total ? (100 * done) / total : 0}%` }} /></span>
          </div>
        </div>
      </header>

      {(course.id === "git" || course.id === "rust") && (
        <p className="native-catalog-note" role="note">
          {course.id === "git"
            ? "These Git activities include native CLI labs. Run the offline course checker on your computer, then record the pass here."
            : "Rust exercises include source drafts and local Cargo test commands. Rust is not compiled inside the Lab browser."}
          {" "}Progress on these activities is self-reported and saved on this device.
        </p>
      )}

      <label className="finder">
        <Search size={17} strokeWidth={1.7} aria-hidden="true" />
        <span className="sr-only">{t("course.find")}</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("course.findPlaceholder")} aria-label={t("course.find")} />
      </label>

      {query.trim() ? (
        <Results route={r} query={query} />
      ) : (
        <div className="chapters">
          {r.levels.map((l) => (
            <Chapter key={l.level.id} lr={l} current={r.current} active={l.level.id === activeLevel} levels={r.levels} />
          ))}
        </div>
      )}
    </div>
  );
}

function Results({ route: r, query }: { route: Route; query: string }) {
  const q = query.trim().toLowerCase();
  const hits = r.all.filter((s) => (s.item.title + " " + s.item.id).toLowerCase().includes(q));
  return (
    <section className="results" aria-live="polite">
      <p className="results-count" role="status">{t("course.results", { n: hits.length })}</p>
      <ol className="route">
        {hits.map((s) => (
          <Rung key={s.item.id} stop={s} showLevel />
        ))}
      </ol>
    </section>
  );
}

function Chapter({ lr, current, active, levels }: { lr: LevelRoute; current: Stop | null; active: boolean; levels: LevelRoute[] }) {
  const [peek, setPeek] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showAhead, setShowAhead] = useState(false);
  const here = current && current.level.id === lr.level.id ? current : null;
  const win = useMemo(() => visibleWindow(lr.stops, here), [lr, here]);
  const previous = levels[lr.chapter - 2];
  const open = active || peek;
  const pct = lr.total ? (100 * lr.done) / lr.total : lr.complete ? 100 : 0;
  const shown = [...(showDone ? win.doneBefore : []), ...win.shown, ...(showAhead ? win.hidden : [])].sort((a, b) => a.index - b.index);
  return (
    <section className={"chapter" + (active ? " active" : "") + (lr.complete ? " complete" : "")} aria-labelledby={"ch-" + lr.level.id}>
      <header className="chapter-head">
        <span className="chapter-numeral" aria-hidden="true">{ROMAN[lr.chapter - 1]}</span>
        <div className="chapter-title">
          <p className="eyebrow">{t("course.chapter", { n: lr.chapter })}</p>
          <h2 id={"ch-" + lr.level.id}>{lr.level.title}</h2>
        </div>
        <div className="chapter-meter">
          <span>{lr.complete ? <><Check size={15} strokeWidth={2} /> {t("course.complete")}</> : `${lr.done} / ${lr.total}`}</span>
          <span className="thin-bar"><span style={{ width: pct + "%" }} /></span>
        </div>
      </header>

      {!open && (
        <div className="chapter-closed">
          <p>{previous && !lr.complete ? t("course.opensAfter", { level: previous.level.title }) : t("course.lessons", { n: lr.stops.length })}</p>
          <button className="button quiet small" onClick={() => setPeek(true)} aria-expanded={false}>
            {t("course.peek")}
          </button>
        </div>
      )}

      {open && (
        <>
          {peek && !active && (
            <button className="button quiet small chapter-close" onClick={() => setPeek(false)} aria-expanded>
              {t("course.closePeek")}
            </button>
          )}
          {win.doneBefore.length > 0 && !peek && (
            <button className="fold done-fold" onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
              <span className="fold-rail" aria-hidden="true" />
              {showDone ? t("course.hideDone") : t("course.showDone", { n: win.doneBefore.length })}
            </button>
          )}
          <ol className="route">
            {(peek && !active ? lr.stops : shown).map((s, i, list) => (
              <Rung key={s.item.id} stop={s} heading={KIND_LABEL[s.kind] && (i === 0 || list[i - 1].kind !== s.kind) ? t(KIND_LABEL[s.kind]!) : null} />
            ))}
          </ol>
          {!peek && win.hidden.length > 0 && !showAhead && (
            <button className="fold ahead-fold" onClick={() => setShowAhead(true)}>
              <span className="fold-rail" aria-hidden="true" />
              <span>
                <strong>{t("course.ahead", { n: win.hidden.length, level: lr.level.title })}</strong>
                <span className="fold-hint">{t("course.showAhead", { level: lr.level.title })}</span>
              </span>
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Rung({ stop, heading, showLevel }: { stop: Stop; heading?: string | null; showLevel?: boolean }) {
  const { number, name: full } = lessonNumber(stop.item.title);
  const name = topic(full);
  const status =
    stop.state === "done"
      ? t("course.complete")
      : stop.state === "current"
        ? t("course.youAreHere")
        : stop.total > 0 && stop.done > 0
          ? t("course.inProgress", { done: stop.done, total: stop.total })
          : stop.total > 0
            ? t("course.checks", { n: stop.total })
            : "";
  return (
    <>
      {heading && <li className="route-heading" aria-hidden="true">{heading}</li>}
      <li className={"rung " + stop.state + " kind-" + stop.kind}>
        <span className="rung-node" aria-hidden="true">{stop.state === "done" ? <Check size={13} strokeWidth={2.4} /> : null}</span>
        <Link href={lessonPath(stop.item.id)} className="rung-link" aria-current={stop.state === "current" ? "step" : undefined}>
          {number && <span className="rung-number">{number}</span>}
          <span className="rung-name">
            {name}
            {showLevel && <span className="rung-level">{stop.level.title}</span>}
          </span>
          <span className="rung-status">{status}</span>
        </Link>
      </li>
    </>
  );
}
