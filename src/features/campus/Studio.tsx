import Link from "next/link";
import { ArrowRight, ExternalLink, FlaskConical } from "lucide-react";
import { lessonPath } from "../../lib/course";
import { pathways, type Experiment } from "../../lib/campus";
import { JourneyNav } from "./Schools";

export type StudioProject = {
  id: string;
  level: "basics" | "intermediate" | "advanced";
  title: string;
  brief: string;
  skills: string;
  prerequisite: string;
  scope: string[];
  acceptance: string[];
  automaticCheck: boolean;
  source: string;
  package: { path: string; source: string; install: string; test: string } | null;
};

const levelName = { basics: "Basics", intermediate: "Intermediate", advanced: "Advanced" } as const;

export function Studio({ projects, experiments }: { projects: StudioProject[]; experiments: (Experiment & { title: string })[] }) {
  return (
    <div className="campus shell page-pad">
      <header className="campus-hero">
        <p className="eyebrow">Swarm Campus · Engineering Studio</p>
        <h1 className="display small">Own a project <em>end to end.</em></h1>
        <p className="lede">
          These are the Python course&apos;s real projects. Each one gives you a brief and acceptance
          criteria; the design, the code and the tests are yours to write.
        </p>
        <JourneyNav here="/studio" />
      </header>

      <section aria-labelledby="studio-how" className="studio-how">
        <h2 id="studio-how">How assessment works</h2>
        <dl>
          <div><dt>Automatic ticket check</dt><dd>The notebook has a project check that runs public acceptance cases on your ticket. Passing it confirms those cases only.</dd></div>
          <div><dt>Review required</dt><dd>No automatic grade. Check your work against the acceptance criteria with your own tests, then ask others to review it.</dd></div>
        </dl>
        <p>The Lab has no submission or review service. Opening or reading a project never marks it complete.</p>
      </section>

      <section aria-labelledby="studio-projects">
        <h2 id="studio-projects" className="sr-only">Projects</h2>
        <div className="studio-grid">
          {projects.map((p) => (
            <article key={p.id} className="studio-card" data-project={p.id} aria-labelledby={"project-" + p.id}>
              <p className="studio-level">{levelName[p.level]} project</p>
              <h3 id={"project-" + p.id}>{p.title.replace(/^Project \d+ — /, "")}</h3>
              <span className={"studio-assess " + (p.automaticCheck ? "auto" : "review")}>
                {p.automaticCheck ? "Automatic ticket check" : "Review required"}
              </span>
              <p className="studio-brief">{p.brief}</p>
              {(p.skills || p.prerequisite) && (
                <dl className="studio-meta">
                  {p.skills && <div><dt>Skills</dt><dd>{p.skills}</dd></div>}
                  {p.prerequisite && <div><dt>Before you start</dt><dd>{p.prerequisite}</dd></div>}
                </dl>
              )}
              {p.acceptance.length > 0 && (
                <details>
                  <summary>Acceptance criteria ({p.acceptance.length})</summary>
                  <ul>{p.acceptance.map((a) => <li key={a}>{a}</li>)}</ul>
                </details>
              )}
              {p.package && (
                <details>
                  <summary>Tests to run</summary>
                  <p>In <code>{p.package.path}</code>:</p>
                  <pre><code>{p.package.install + "\n" + p.package.test}</code></pre>
                </details>
              )}
              <div className="studio-links">
                <Link href={lessonPath(p.id)} className="button primary small">Open in the Lab <ArrowRight size={15} /></Link>
                <a href={p.source} className="studio-source">Notebook source <ExternalLink size={13} aria-hidden="true" /><span className="sr-only"> (GitHub)</span></a>
                {p.package && <a href={p.package.source} className="studio-source">Package source <ExternalLink size={13} aria-hidden="true" /><span className="sr-only"> (GitHub)</span></a>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="studio-submit" className="studio-submit">
        <h2 id="studio-submit">Sharing your work</h2>
        <ol>
          <li>Build the project in your own copy: the notebook in the Lab, Jupyter or Colab, or a repository of your own.</li>
          <li>Write the tests the acceptance criteria call for, and a short README with your design decisions.</li>
          <li>Publish it in your own GitHub repository and ask peers to review it there. See the <Link href="/community">review guide</Link>.</li>
          <li>Found a mistake in a project brief? Report it with the <a href={pathways.fix}>content fix template</a>.</li>
        </ol>
      </section>

      <section aria-labelledby="research-title" className="research" id="research">
        <h2 id="research-title"><FlaskConical size={22} aria-hidden="true" /> Research experiments</h2>
        <p className="lede small">
          Questions you answer with measurements, using the code you wrote in an Advanced project.
          These are open exercises, not published studies.
        </p>
        <div className="research-grid">
          {experiments.map((e) => (
            <article key={e.id} className="research-card" aria-labelledby={"exp-" + e.id}>
              <p className="studio-level">{e.theme}</p>
              <h3 id={"exp-" + e.id}>{e.question}</h3>
              <h4>Experiment</h4>
              <ol>{e.method.map((m) => <li key={m}>{m}</li>)}</ol>
              <h4>Evidence to report</h4>
              <p>{e.evidence}</p>
              <p className="research-source">Builds on <Link href={lessonPath(e.project)}>{e.title}</Link>, section “{e.section}”.</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
