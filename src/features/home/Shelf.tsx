import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { courses, coursePath } from "../../lib/courses";
import { t } from "../../i18n";
// Courses as book spines on a shelf: open ones invite you in, others are "in preparation".
export function Shelf({ heading = true }: { heading?: boolean }) {
  return (
    <section className="shelf" aria-labelledby="shelf-title" id="shelf">
      {heading && (
        <header className="section-head">
          <p className="eyebrow">§ 2</p>
          <h2 id="shelf-title">{t("home.shelf.title")}</h2>
          <p className="section-lede">{t("home.shelf.lede")}</p>
        </header>
      )}
      <ul className="spines">
        {courses.map((c) => {
          const body = (
            <>
              <span className="spine-edge" style={{ background: c.hue }} aria-hidden="true" />
              <span className="spine-lang">{c.language}</span>
              <span className="spine-title">{c.title}</span>
              <span className="spine-blurb">{c.blurb}</span>
              <span className="spine-status">
                {c.status === "open" ? (
                  <>
                    {t("home.shelf.open")} <ArrowUpRight size={15} strokeWidth={1.8} />
                  </>
                ) : (
                  t("home.shelf.soon")
                )}
              </span>
            </>
          );
          return (
            <li key={c.id} className={"spine " + c.status}>
              {c.status === "open" ? <Link href={coursePath(c.id)}>{body}</Link> : <div aria-disabled="true">{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
