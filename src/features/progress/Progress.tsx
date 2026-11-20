"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Upload, Trash2, ArrowRight } from "lucide-react";
import { exportData, importData, onProgress, read, STORE } from "./store";
import { download, lessonPath, type Catalog } from "../../lib/course";
import { lessonNumber, route, topic } from "../../lib/journey";
import { t } from "../../i18n";

const DAY = 86_400_000;
const WEEKS = 20;
const dayKey = (ms: number) => new Date(ms).toDateString();

// Turns completion timestamps into a calendar, streaks and a recent-activity list.
function activity(done: Record<string, number>, titles: Map<string, string>) {
  const entries = Object.entries(done).filter(([, ms]) => ms > 1_000_000_000_000);
  const perDay = new Map<string, number>();
  for (const [, ms] of entries) perDay.set(dayKey(ms), (perDay.get(dayKey(ms)) ?? 0) + 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = today.getTime() - (WEEKS * 7 - 1 - ((today.getDay() + 6) % 7)) * DAY;
  const days: { key: string; n: number; future: boolean; label: string }[] = [];
  for (let ms = start; days.length < WEEKS * 7; ms += DAY) {
    const d = new Date(ms);
    days.push({ key: dayKey(ms), n: perDay.get(dayKey(ms)) ?? 0, future: ms > today.getTime(), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
  }
  let streak = 0;
  for (let ms = today.getTime(); perDay.has(dayKey(ms)) || (ms === today.getTime() && perDay.has(dayKey(ms - DAY))); ms -= DAY) {
    if (perDay.has(dayKey(ms))) streak++;
  }
  const recent = entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, ms]) => {
      const [id, check] = key.split("#");
      return { id, check, ms, title: topic(lessonNumber(titles.get(id) ?? id).name) };
    });
  return { days, streak, activeDays: perDay.size, recent };
}

function ago(ms: number) {
  const s = (Date.now() - ms) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.max(1, Math.round(s / 60)), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}
function checkLabel(check: string) {
  if (check.startsWith("wb:")) return check.slice(3).replace(/_/g, " ");
  if (/^q\d+$/.test(check)) return t("progress.quizQ", { n: check.slice(1) });
  if (/^ex\d+$/.test(check)) return t("progress.exercise", { n: check.slice(2) });
  return check;
}

export function Progress({ catalog, sqlCatalog }: { catalog: Catalog; sqlCatalog: Catalog }) {
  const [message, setMessage] = useState(""),
    [tick, refresh] = useState(0);
  useEffect(() => onProgress(() => refresh((n) => n + 1)), []);
  const state = read();
  const r = useMemo(() => {
    const python = route(catalog);
    const sql = route(sqlCatalog);
    return {
      all: [...python.all, ...sql.all],
      levels: [...python.levels, ...sql.levels],
      current: read().last?.startsWith("sql/") ? sql.current : python.current,
    };
  }, [catalog, sqlCatalog, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const titles = useMemo(() => new Map(r.all.map((s) => [s.item.id, s.item.title])), [r]);
  const a = useMemo(() => activity(state.done ?? {}, titles), [state.done, titles]); // eslint-disable-line react-hooks/exhaustive-deps
  const checks = Object.keys(state.done ?? {}).length;
  const totalChecks = r.levels.reduce((n, l) => n + l.total, 0);
  const finished = r.all.filter((s) => s.state === "done").length;
  const pct = totalChecks ? Math.round((100 * r.levels.reduce((n, l) => n + l.done, 0)) / totalChecks) : 0;
  const ring = 2 * Math.PI * 54;
  return (
    <div className="shell page-pad prog">
      <header className="prog-head">
        <figure className="prog-ring" aria-label={t("progress.overall", { pct })}>
          <svg viewBox="0 0 128 128" aria-hidden="true">
            <defs>
              <linearGradient id="prog-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#45e3ae" />
                <stop offset="1" stopColor="#31bfd9" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r="54" className="ring-track" />
            <circle cx="64" cy="64" r="54" className="ring-arc" strokeDasharray={`${(ring * pct) / 100} ${ring}`} opacity={pct > 0 ? 1 : 0} transform="rotate(-90 64 64)" />
          </svg>
          <figcaption><strong>{pct}%</strong></figcaption>
        </figure>
        <div className="prog-title">
          <h1 className="display small">{t("progress.title")}</h1>
          {r.current && (
            <Link className="button primary" href={lessonPath(r.current.item.id)}>
              {t("progress.continue", { name: lessonNumber(r.current.item.title).name })} <ArrowRight size={17} strokeWidth={1.8} />
            </Link>
          )}
        </div>
        <dl className="prog-stats">
          <div className="s1"><dt>{t("progress.lessons")}</dt><dd>{finished}<small>/{r.all.length}</small></dd></div>
          <div className="s2"><dt>{t("progress.checks")}</dt><dd>{checks}</dd></div>
          <div className="s3"><dt>{t("progress.activeDays")}</dt><dd>{a.activeDays}</dd></div>
          <div className="s4"><dt>{t("progress.streak")}</dt><dd>{a.streak}</dd></div>
        </dl>
      </header>

      <div className="prog-grid">
        <section className="sheet">
          <div className="sheet-head">
            <h2>{t("progress.activity")}</h2>
            <span className="legend" aria-hidden="true">
              {t("progress.less")} <i className="l0" /><i className="l1" /><i className="l2" /><i className="l3" /> {t("progress.more")}
            </span>
          </div>
          <div className="heatmap" role="img" aria-label={t("progress.activityLabel", { n: a.activeDays, weeks: WEEKS })}>
            {a.days.map((d) => (
              <i
                key={d.key}
                className={d.future ? "future" : "l" + (d.n === 0 ? 0 : d.n < 3 ? 1 : d.n < 7 ? 2 : 3)}
                title={d.future ? undefined : `${d.label}: ${d.n}`}
              />
            ))}
          </div>
          <h2 className="sheet-sub">{t("progress.recent")}</h2>
          {a.recent.length ? (
            <ul className="recent">
              {a.recent.map((x) => (
                <li key={x.id + x.check}>
                  <span className="recent-dot" aria-hidden="true" />
                  <Link href={lessonPath(x.id)}>{x.title}</Link>
                  <span className="recent-check">{checkLabel(x.check)}</span>
                  <time>{ago(x.ms)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted-note">{t("progress.noneYet")}</p>
          )}
        </section>

        <section className="sheet">
          <h2>{t("progress.chapters")}</h2>
          <ul className="chapter-strips">
            {r.levels.map((lr, i) => (
              <li key={i + "-" + lr.level.id}>
                <div className="strip-head">
                  <span className="strip-n">{["I", "II", "III", "IV", "V", "VI"][i]}</span>
                  <span className="strip-title">{i < 3 ? "Python" : "SQL"} · {lr.level.title}</span>
                  <span className="strip-count">{lr.stops.filter((s) => s.state === "done").length} / {lr.stops.length}</span>
                </div>
                <ol className="strip" aria-label={lr.level.title}>
                  {lr.stops.map((s) => (
                    <li key={s.item.id} className={s.state} title={s.item.title}>
                      <span className="sr-only">{s.item.title}</span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <details className="backup">
        <summary>{t("progress.move")}</summary>
        <p>{t("progress.moveBody")}</p>
        <div className="button-row">
          <button className="button ink small" onClick={() => download("swarmladderlab-progress.json", exportData(), "application/json")}>
            <Download size={15} /> {t("progress.export")}
          </button>
          <label className="button quiet small file-button">
            <Upload size={15} /> {t("progress.import")}
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  importData(await file.text());
                  setMessage(t("progress.imported"));
                } catch (err) {
                  setMessage(String(err));
                }
              }}
            />
          </label>
          <button
            className="button quiet small danger"
            onClick={() => {
              if (confirm(t("progress.resetConfirm"))) {
                localStorage.removeItem(STORE);
                window.dispatchEvent(new Event("swl-progress"));
                setMessage(t("progress.resetDone"));
              }
            }}
          >
            <Trash2 size={15} /> {t("progress.reset")}
          </button>
        </div>
      </details>
      <p className="notice" role="status">{message}</p>
    </div>
  );
}
