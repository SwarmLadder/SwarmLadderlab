"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { lessonPath, type Catalog } from "../../lib/course";
import { coursePath } from "../../lib/courses";
import { lessonNumber, route, type Route, type Stop } from "../../lib/journey";
import { onProgress, read } from "../progress/store";
import { Shelf } from "./Shelf";
import { LadderMark } from "../../components/Brand";
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
      {returning && r.current ? (
        <>
          <Desk route={r} />
          <Shelf />
        </>
      ) : (
        <>
          <Welcome route={r} />
          <Climb route={r} />
          <Shelf />
          <Close route={r} />
        </>
      )}
    </div>
  );
}

function Welcome({ route: r }: { route: Route }) {
  const first = r.all[0];
  const checks = r.levels.reduce((n, l) => n + l.total, 0);
  return (
    <section className="hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{t("home.eyebrow", { tagline: t("brand.tagline") })}</p>
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
            <a className="button quiet large" href="#climb">{t("home.how")}</a>
          </div>
          <p className="hero-proof">{t("home.proof")}</p>
        </div>
        <Plate />
      </div>
      <dl className="ledger shell">
        <div><dt>{t("home.ledger.lessons")}</dt><dd>{r.all.length}</dd></div>
        <div><dt>{t("home.ledger.checks")}</dt><dd>{checks}</dd></div>
        <div><dt>{t("home.ledger.levels")}</dt><dd>{r.levels.length}</dd></div>
        <div><dt>{t("home.ledger.accounts")}</dt><dd>0</dd></div>
      </dl>
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

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

// The route as a ladder. Rungs light up as they scroll into view.
function Climb({ route: r }: { route: Route }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return root?.classList.add("all-seen");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("seen"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -12% 0px" },
    );
    root.querySelectorAll(".rung-row").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <section className="climb" id="climb" aria-labelledby="climb-title">
      <div className="shell climb-grid">
        <header className="climb-copy">
          <p className="section-mark">§ 1</p>
          <h2 id="climb-title">{t("home.climb.title")}</h2>
          <p className="lede">{t("home.climb.lede")}</p>
          <ol className="climb-method">
            <li><span>i.</span>{t("home.climb.p1")}</li>
            <li><span>ii.</span>{t("home.climb.p2")}</li>
            <li><span>iii.</span>{t("home.climb.p3")}</li>
          </ol>
        </header>
        <ol className="ladder" ref={ref}>
          {r.levels.map((lr, i) => {
            const lessons = lr.stops.filter((s) => s.kind === "lesson");
            const shown = lessons.slice(0, 4);
            return (
              <li key={lr.level.id} className="ladder-chapter">
                <div className="rung-row chapter-row">
                  <span className="chapter-numeral">{ROMAN[i] ?? i + 1}</span>
                  <div>
                    <span className="eyebrow">{t("home.climb.rung", { n: i + 1 })} · {t("course.lessons", { n: lr.stops.length })}</span>
                    <h3>{lr.level.title}</h3>
                  </div>
                </div>
                {shown.map((s) => {
                  const { number, name } = lessonNumber(s.item.title);
                  return (
                    <div key={s.item.id} className="rung-row">
                      <span className="rung-bar" aria-hidden="true" />
                      <span className="rung-num">{number}</span>
                      <span className="rung-title">{name}</span>
                    </div>
                  );
                })}
                <div className="rung-row rung-more">
                  <span className="rung-bar" aria-hidden="true" />
                  <span className="rung-title">{t("home.climb.more", { n: lr.stops.length - shown.length })}</span>
                </div>
              </li>
            );
          })}
          <li className="ladder-top rung-row">{t("home.climb.top")}</li>
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
        <p className="close-privacy">{t("home.privacy")}</p>
      </div>
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
