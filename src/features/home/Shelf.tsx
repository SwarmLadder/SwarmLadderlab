"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { courses, coursePath, type Course } from "../../lib/courses";
import { t } from "../../i18n";

// Courses as cloth-bound spines standing on a shelf. Hover or focus a spine to read its jacket.
const HEIGHTS = ["100%", "88%", "94%", "84%", "91%", "86%"];
export function Shelf({ heading = true }: { heading?: boolean }) {
  const [picked, setPicked] = useState<Course>(courses[0]);
  return (
    <section className={"shelf" + (heading ? "" : " bare")} aria-labelledby={heading ? "shelf-title" : undefined} id="shelf">
      {heading && (
        <header className="shelf-head shell">
          <p className="section-mark">§ 1</p>
          <h2 id="shelf-title">{t("home.shelf.title")}</h2>
        </header>
      )}
      <div className="shell shelf-grid">
        <div className="bookcase">
          <ul className="spines" aria-label={t("home.shelf.choose")}>
            {courses.map((c, i) => {
              const inner = (
                <>
                  <span className="spine-band" aria-hidden="true" />
                  <span className="spine-lang">{c.language}</span>
                  <span className="spine-title">{c.title}</span>
                  <span className="spine-foot" aria-hidden="true">SL</span>
                  {c.status === "open" && <span className="spine-ribbon" aria-hidden="true" />}
                </>
              );
              const common = {
                className: "spine-body",
                style: { ["--cloth" as string]: c.hue, height: HEIGHTS[i % HEIGHTS.length] },
                onMouseEnter: () => setPicked(c),
                onFocus: () => setPicked(c),
              };
              return (
                <li key={c.id} className={"spine " + c.status + (picked.id === c.id ? " picked" : "")}>
                  {c.status === "open" ? (
                    <Link href={coursePath(c.id)} {...common} aria-label={`${c.title}, ${t("home.shelf.now")}`}>
                      {inner}
                    </Link>
                  ) : (
                    <button type="button" {...common} aria-label={`${c.title}, ${t("home.shelf.later")}`}>
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="plank" aria-hidden="true" />
        </div>
        <article className="jacket" aria-live="polite">
          <p className={"jacket-status " + picked.status}>{picked.status === "open" ? t("home.shelf.now") : t("home.shelf.later")}</p>
          <h3>{picked.title}</h3>
          <p className="jacket-lang">{picked.language}</p>
          <p className="jacket-blurb">{picked.blurb}</p>
          {picked.status === "open" ? (
            <Link className="button ink" href={coursePath(picked.id)}>
              {t("home.shelf.open")} <ArrowRight size={16} strokeWidth={1.8} />
            </Link>
          ) : (
            <p className="jacket-soon">{t("home.shelf.soon")}</p>
          )}
        </article>
      </div>
    </section>
  );
}
