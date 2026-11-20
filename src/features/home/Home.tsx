"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { lessonPath, type Catalog } from "../../lib/course";
import { coursePath } from "../../lib/courses";
import { lessonNumber, route, type Route, type Stop } from "../../lib/journey";
import { onProgress, read } from "../progress/store";
import { Shelf } from "./Shelf";
import { t } from "../../i18n";

function useRoute(catalog: Catalog): Route {
  const [r, setR] = useState(() => route(catalog));
  useEffect(() => onProgress(() => setR(route(catalog))), [catalog]);
  return r;
}

export function Home({ catalog }: { catalog: Catalog }) {
  const r = useRoute(catalog);
  const returning = Boolean(read().last) || r.all.some((s) => s.done > 0);
  return (
    <div className="home">
      {returning && r.current ? <Desk route={r} /> : <Welcome route={r} />}
      <Method />
      <Shelf />
      <p className="privacy-note shell-narrow">{t("home.privacy")}</p>
    </div>
  );
}

function Welcome({ route: r }: { route: Route }) {
  const first = r.all[0];
  return (
    <section className="hero shell">
      <div className="hero-copy">
        <p className="eyebrow">{t("home.eyebrow", { tagline: t("brand.tagline") })}</p>
        <h1 className="display">
          {t("home.title.a")}
          <br />
          <em>{t("home.title.b")}</em>
        </h1>
        <p className="lede">{t("home.lede")}</p>
        <div className="hero-actions">
          {first && (
            <Link className="button primary" href={lessonPath(first.item.id)}>
              {t("home.begin")} <ArrowRight size={18} strokeWidth={1.8} />
            </Link>
          )}
          <a className="button quiet" href="#method">{t("home.how")}</a>
        </div>
      </div>
      <Specimen />
    </section>
  );
}

// A living page from the course: the blank fills in and the check lands.
function Specimen() {
  return (
    <figure className="specimen" aria-label="Example exercise: fill the blank so the loop adds 1 to 100, then check.">
      <div className="specimen-head">
        <span>Exercise 1 · for loops</span>
        <span className="specimen-page">p. 06</span>
      </div>
      <pre className="specimen-code" aria-hidden="true">
        <span className="k">total</span> = <span className="n">0</span>
        {"\n"}
        <span className="k">for</span> n <span className="k">in</span> range(<span className="n">1</span>, <span className="blank"><span className="blank-empty">___</span><span className="blank-filled">101</span></span>):
        {"\n"}
        {"    "}total += n
        {"\n"}check(<span className="n">1</span>, total)
      </pre>
      <figcaption className="specimen-result">
        <span className="stamp">✓</span> Exercise 1: correct
      </figcaption>
      <p className="specimen-note">Fill one blank. Get a check. Climb a rung.</p>
    </figure>
  );
}

function Method() {
  const steps = [1, 2, 3] as const;
  return (
    <section className="method shell" id="method" aria-labelledby="method-title">
      <header className="section-head">
        <p className="eyebrow">§ 1</p>
        <h2 id="method-title">{t("home.method.title")}</h2>
      </header>
      <ol className="method-steps">
        {steps.map((n) => (
          <li key={n}>
            <span className="method-n" aria-hidden="true">{n}</span>
            <h3>{t(`home.method.${n}.t`)}</h3>
            <p>{t(`home.method.${n}.d`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function stopLabel(s: Stop) {
  const { number, name } = lessonNumber(s.item.title);
  return { number, name };
}

function Desk({ route: r }: { route: Route }) {
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
          <Link className="text-link" href={coursePath("python")}>{t("lesson.complete.route")} →</Link>
        </div>
      </div>
    </section>
  );
}
