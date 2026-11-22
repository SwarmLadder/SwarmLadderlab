"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { studioSlug, type Experiment } from "../../lib/campus";
import { TechLogo } from "../../components/TechLogo";
import { evaluation, levelName, projectName, type StudioProject } from "../../lib/studio";

export type { StudioProject };

export function Studio({ projects, experiments }: { projects: StudioProject[]; experiments: (Experiment & { title: string })[] }) {
  const [level, setLevel] = useState<"all" | StudioProject["level"]>("all");
  const [kind, setKind] = useState<"all" | "auto" | "review">("all");
  const shown = projects.filter((p) => (level === "all" || p.level === level) && (kind === "all" || (kind === "auto") === p.automaticCheck));
  return (
    <div className="studio shell page-pad">
      <header className="studio-head">
        <p className="eyebrow">Engineering Studio</p>
        <h1 className="display small">Own a project <em>end to end.</em></h1>
        <p className="lede">Real projects from the Python course. You get a brief and acceptance criteria; the design, code and tests are yours.</p>
      </header>

      <div className="studio-toolbar">
        <div role="group" aria-label="Filter by level" className="catalog-filters">
          {(["all", "basics", "intermediate", "advanced"] as const).map((l) => (
            <button key={l} type="button" className={"catalog-filter" + (level === l ? " active" : "")} aria-pressed={level === l} onClick={() => setLevel(l)}>
              {l === "all" ? "All levels" : levelName[l]}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Filter by evaluation" className="catalog-filters">
          {([["all", "Any evaluation"], ["auto", "Automatic check"], ["review", "Review required"]] as const).map(([k, label]) => (
            <button key={k} type="button" className={"catalog-filter" + (kind === k ? " active" : "")} aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>
          ))}
        </div>
      </div>
      <p className="library-results" role="status" aria-live="polite">{shown.length} project{shown.length === 1 ? "" : "s"}</p>

      <ol className="studio-list">
        {shown.map((p) => (
          <li key={p.id} className="studio-row" data-project={p.id}>
            <span className={"studio-level " + p.level}>{levelName[p.level]}</span>
            <div className="studio-row-main">
              <h2><Link href={"/studio/" + studioSlug(p.id)}>{projectName(p)}</Link></h2>
              <p>{p.skills || p.scope.slice(0, 3).join(" · ")}</p>
            </div>
            <span className="studio-tech"><TechLogo id="python" size={18} /> Python</span>
            <span className={"studio-assess " + (p.automaticCheck ? "auto" : "review")}>{evaluation(p)}</span>
            <Link className="studio-open" href={"/studio/" + studioSlug(p.id)} aria-label={"Open brief: " + projectName(p)}>Brief <ArrowRight size={15} /></Link>
          </li>
        ))}
      </ol>
      <p className="studio-note">Opening a project never marks it complete. Automatic checks confirm their public cases only; everything else needs your own tests and a reviewer.</p>

      <section className="research" id="research" aria-labelledby="research-title">
        <div className="research-head">
          <h2 id="research-title"><FlaskConical size={22} aria-hidden="true" /> Research experiments</h2>
          <p>Measurable questions answered with code you wrote in an Advanced project. Open exercises, not published studies.</p>
        </div>
        <ol className="research-list">
          {experiments.map((e) => (
            <li key={e.id}>
              <span className="research-theme">{e.theme}</span>
              <Link href={"/studio/research/" + e.id}>{e.question}</Link>
              <span className="research-source">Builds on {e.title}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
