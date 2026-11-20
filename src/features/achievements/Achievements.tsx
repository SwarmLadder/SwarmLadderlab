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

export function Achievements({ catalog }: { catalog: Catalog }) {
  const [login, setLogin] = useState(localStorage.getItem("swarmladderlab.login") || ""),
    [error, setError] = useState("");
  return (
    <div className="shell page-pad">
      <header className="page-head">
        <p className="eyebrow">{t("nav.achievements")}</p>
        <h1 className="display small">{t("ach.title")}</h1>
        <p className="lede">{t("ach.lede")}</p>
        <label className="field">
          {t("ach.login")}
          <input autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} />
        </label>
        <p className="notice error" role="alert">{error}</p>
      </header>
      <div className="badges">
        {catalog.levels.map((l, i) => {
          const books = Object.entries(catalog.workbooks)
            .filter(([, w]) => w.level === l.id)
            .map(([id, w]) => ({ ...w, id, missing: w.exercises.filter((x) => !doneIn(id).includes("wb:" + x)) }));
          const total = books.reduce((n, w) => n + w.exercises.length, 0),
            remaining = books.reduce((n, w) => n + w.missing.length, 0),
            earned = total > 0 && remaining === 0,
            pct = total ? Math.round((100 * (total - remaining)) / total) : 0;
          return (
            <article className={"badge-card" + (earned ? " earned" : "")} key={l.id}>
              <div className="badge-seal" aria-hidden>{earned ? "✓" : ROMAN[i] ?? i + 1}</div>
              <h2>{l.title}</h2>
              <div className="chapter-meter">
                <span>
                  {total - remaining} / {total} {t("ach.passed")}
                </span>
                <span className="thin-bar"><span style={{ width: pct + "%" }} /></span>
              </div>
              <ul className="badge-list">
                {books.map((w) => (
                  <li key={w.id}>
                    <Link href={lessonPath(w.id)}>
                      <span>
                        {l.sections.flatMap((s) => s.items).find((it) => it.id === w.id)?.title ?? w.module}
                      </span>
                      <small>
                        {w.missing.length
                          ? `${w.exercises.length - w.missing.length}/${w.exercises.length}`
                          : t("ach.all")}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
              {!earned ? (
                <p className="badge-locked">{t("ach.locked")}</p>
              ) : (
                <ol className="claim-steps">
                  <li>
                    <a href={courseRepo + "/fork"}>{t("ach.fork")}</a>
                  </li>
                  <li>
                    {t("ach.upload")}
                    <br />
                    {books.map((w) => (
                      <button
                        key={w.id}
                        className="button quiet small"
                        onClick={() => solutions(w.id, w.module).catch((e) => setError(String(e)))}
                      >
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
                          "https://github.com/" +
                            name +
                            "/python-notebook/new/main?" +
                            new URLSearchParams({
                              filename: "achievements/claims/" + name + ".md",
                              value: "level: " + l.id + "\nname: " + name + "\n",
                            }),
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
    </div>
  );
}
