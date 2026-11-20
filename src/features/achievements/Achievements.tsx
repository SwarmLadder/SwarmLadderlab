"use client";
import { useState } from "react";
import Link from "next/link";
import { courseRepo, download, lessonPath, notebookData, type Catalog } from "../../lib/course";
import { doneIn, read } from "../progress/store";
import { t } from "../../i18n";

async function solutions(id: string, module: string) {
  const nb = await notebookData(id);
  const parts = [`# My solutions for ${module}, written on SwarmLadderlab.`, ""];
  for (const c of nb.cells) {
    if (c.type !== "code" || c.kind === "check") continue;
    let source = read().code?.[id]?.[c.id] ?? c.source;
    if (c.kind === "setup")
      source = source
        .split("\n")
        .filter((l) => !l.startsWith("from check import") && !l.startsWith("check = Checker("))
        .join("\n")
        .trim();
    if (source) parts.push(source, "");
  }
  download(module + ".py", parts.join("\n").replace(/\n{3,}/g, "\n\n"), "text/x-python");
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// A seal: a ring that fills with progress around the chapter's numeral.
function Seal({ numeral, pct, earned, size = 120 }: { numeral: string; pct: number; earned: boolean; size?: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg className={"seal" + (earned ? " earned" : "")} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={"seal-" + numeral} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#45e3ae" />
          <stop offset="1" stopColor="#31bfd9" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" className="seal-face" />
      <circle cx="60" cy="60" r={r} className="seal-track" />
      <circle
        cx="60" cy="60" r={r}
        className="seal-arc"
        stroke={`url(#seal-${numeral})`}
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        opacity={pct > 0 ? 1 : 0}
        transform="rotate(-90 60 60)"
      />
      <circle cx="60" cy="60" r="42" className="seal-inner" />
      <text x="60" y="61" className="seal-numeral" textAnchor="middle" dominantBaseline="middle">{earned ? "✓" : numeral}</text>
    </svg>
  );
}

export function Achievements({ catalog }: { catalog: Catalog }) {
  const [login, setLogin] = useState(localStorage.getItem("swarmladderlab.login") || ""),
    [error, setError] = useState("");
  const titles = new Map(catalog.levels.flatMap((l) => l.sections.flatMap((s) => s.items)).map((it) => [it.id, it.title]));
  const levels = catalog.levels.map((l, i) => {
    const books = Object.entries(catalog.workbooks)
      .filter(([, w]) => w.level === l.id)
      .map(([id, w]) => ({ ...w, id, title: titles.get(id) ?? w.module, missing: w.exercises.filter((x) => !doneIn(id).includes("wb:" + x)) }));
    const total = books.reduce((n, w) => n + w.exercises.length, 0),
      remaining = books.reduce((n, w) => n + w.missing.length, 0);
    return { l, i, books, total, remaining, earned: total > 0 && remaining === 0, pct: total ? Math.round((100 * (total - remaining)) / total) : 0 };
  });
  const earnedCount = levels.filter((x) => x.earned).length;
  return (
    <div className="shell page-pad ach">
      <header className="ach-head">
        <div>
          <p className="eyebrow">{t("nav.achievements")}</p>
          <h1 className="display small">{t("ach.title")}</h1>
          <p className="lede">{t("ach.lede")}</p>
        </div>
        <div className="ach-summary">
          <div className="ach-seals" aria-hidden="true">
            {levels.map((x) => <Seal key={x.l.id} numeral={ROMAN[x.i] ?? String(x.i + 1)} pct={x.pct} earned={x.earned} size={64} />)}
          </div>
          <p><strong>{earnedCount}</strong> {t("ach.of", { n: levels.length })}</p>
        </div>
      </header>

      <ol className="ach-path">
        <li><span>1</span><div><h3>{t("ach.step1")}</h3><p>{t("ach.step1d")}</p></div></li>
        <li><span>2</span><div><h3>{t("ach.step2")}</h3><p>{t("ach.step2d")}</p></div></li>
        <li><span>3</span><div><h3>{t("ach.step3")}</h3><p>{t("ach.step3d")}</p></div></li>
      </ol>

      <div className="seal-cards">
        {levels.map(({ l, i, books, total, remaining, earned, pct }) => {
          const next = books.find((w) => w.missing.length);
          return (
            <article className={"seal-card" + (earned ? " earned" : "")} key={l.id}>
              <div className="seal-card-top">
                <Seal numeral={ROMAN[i] ?? String(i + 1)} pct={pct} earned={earned} />
                <div>
                  <p className="eyebrow">{t("home.climb.rung", { n: i + 1 })}</p>
                  <h2>{t("ach.seal", { level: l.title })}</h2>
                  <p className="seal-count"><strong>{total - remaining}</strong> / {total} {t("ach.passed")}</p>
                </div>
              </div>
              <ul className="wb-list">
                {books.map((w) => {
                  const done = w.exercises.length - w.missing.length;
                  return (
                    <li key={w.id} className={w.missing.length ? "" : "complete"}>
                      <Link href={lessonPath(w.id)}>
                        <span className="wb-title">{w.title}</span>
                        <span className="wb-meter"><span style={{ width: `${(100 * done) / (w.exercises.length || 1)}%` }} /></span>
                        <small>{w.missing.length ? `${done}/${w.exercises.length}` : t("ach.all")}</small>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {!earned ? (
                <div className="seal-foot">
                  <p className="badge-locked">{t("ach.locked")}</p>
                  {next && (
                    <Link className="button quiet small" href={lessonPath(next.id)}>
                      {t("ach.continueWith", { name: next.title })}
                    </Link>
                  )}
                </div>
              ) : (
                <ol className="claim-steps">
                  <li>
                    <a href={courseRepo + "/fork"}>{t("ach.fork")}</a>
                  </li>
                  <li>
                    {t("ach.upload")}
                    <br />
                    {books.map((w) => (
                      <button key={w.id} className="button quiet small" onClick={() => solutions(w.id, w.module).catch((e) => setError(String(e)))}>
                        {w.module}.py
                      </button>
                    ))}
                  </li>
                  <li>
                    <button
                      className="button primary small"
                      onClick={() => {
                        const name = login.trim();
                        if (!/^[A-Za-z0-9-]{1,39}$/.test(name)) {
                          setError(t("ach.needLogin"));
                          return;
                        }
                        setError("");
                        localStorage.setItem("swarmladderlab.login", name);
                        window.open(
                          "https://github.com/" + name + "/python-notebook/new/main?" +
                            new URLSearchParams({ filename: "achievements/claims/" + name + ".md", value: "level: " + l.id + "\nname: " + name + "\n" }),
                          "_blank",
                          "noopener",
                        );
                      }}
                    >
                      {t("ach.claim")}
                    </button>{" "}
                    {t("ach.claimAfter")}
                  </li>
                  <li>{t("ach.verify")}</li>
                </ol>
              )}
            </article>
          );
        })}
      </div>

      <section className="claim-id">
        <div>
          <h2>{t("ach.idTitle")}</h2>
          <p>{t("ach.idBody")}</p>
        </div>
        <label className="field">
          {t("ach.login")}
          <input autoComplete="username" placeholder="octocat" value={login} onChange={(e) => setLogin(e.target.value)} />
        </label>
        <p className="notice error" role="alert">{error}</p>
      </section>
    </div>
  );
}
