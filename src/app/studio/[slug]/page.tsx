import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import studio from "../../../../public/data/studio.json";
import { evaluation, levelName, projectName, type StudioProject } from "../../../lib/studio";
import { pathways, studioSlug } from "../../../lib/campus";
import { lessonPath } from "../../../lib/course";
import { TechLogo } from "../../../components/TechLogo";

const projects = studio as StudioProject[];
export const dynamicParams = false;
export function generateStaticParams() {
  return projects.map((p) => ({ slug: studioSlug(p.id) }));
}
const find = async (params: Promise<{ slug: string }>) => {
  const slug = (await params).slug;
  return projects.find((p) => studioSlug(p.id) === slug);
};
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await find(params);
  return { title: (p ? projectName(p) : "Project") + " · Engineering Studio" };
}

// A project brief laid out like an engineering ticket: what to build, how it is
// accepted, how to test it, and how to get it reviewed. Nothing here records completion.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const p = await find(params);
  if (!p) notFound();
  return (
    <div className="ticket shell page-pad">
      <nav className="crumbs-line" aria-label="Breadcrumb">
        <Link href="/studio">Engineering Studio</Link> <span aria-hidden="true">/</span> <span>{levelName[p.level]}</span>
      </nav>
      <header className="ticket-head">
        <p className="ticket-key">{p.id.replace("/projects/", " · ").replace(/_/g, " ")}</p>
        <h1>{projectName(p)}</h1>
        <p className="lede">{p.brief}</p>
      </header>
      <div className="ticket-body">
        <article className="ticket-main">
          {p.scope.length > 0 && (
            <section aria-labelledby="t-scope">
              <h2 id="t-scope">What you will build</h2>
              <ul>{p.scope.map((s) => <li key={s}>{s}</li>)}</ul>
            </section>
          )}
          <section aria-labelledby="t-accept">
            <h2 id="t-accept">Acceptance criteria</h2>
            <ul className="ticket-checklist">{p.acceptance.map((a) => <li key={a}>{a}</li>)}</ul>
          </section>
          <section aria-labelledby="t-test">
            <h2 id="t-test">How it is tested</h2>
            {p.automaticCheck
              ? <p>The notebook ends with a <b>project check</b> that runs public acceptance cases on your ticket. Passing it confirms those cases only; add your own tests for the rest.</p>
              : <p>There is no automatic grade. Prove each criterion with your own tests and a short write-up, then ask for review.</p>}
            {p.package && (
              <>
                <p>The companion package has its own tests. From <code>{p.package.path}</code>:</p>
                <pre className="ticket-cmd"><code>{p.package.install + "\n" + p.package.test}</code></pre>
              </>
            )}
          </section>
          <section aria-labelledby="t-review">
            <h2 id="t-review">Submitting for review</h2>
            <ol>
              <li>Build it in your own copy: the notebook in the Lab, Jupyter or Colab, or a repository of your own.</li>
              <li>Write a README with your design decisions and the evidence for each criterion.</li>
              <li>Publish it in your own GitHub repository and ask a peer to review it with the <Link href="/community#review">review guide</Link>.</li>
              <li>Found a mistake in this brief? <a href={pathways.fix}>Report it</a>.</li>
            </ol>
            <p className="ticket-honest">The Lab has no submission service and never records this project as complete.</p>
          </section>
        </article>
        <aside className="ticket-side" aria-label="Project details">
          <dl>
            <div><dt>Level</dt><dd>{levelName[p.level]}</dd></div>
            <div><dt>Technology</dt><dd><TechLogo id="python" size={16} /> Python</dd></div>
            {p.skills && <div><dt>Skills</dt><dd>{p.skills}</dd></div>}
            {p.prerequisite && <div><dt>Before you start</dt><dd>{p.prerequisite}</dd></div>}
            <div><dt>Evaluation</dt><dd><span className={"studio-assess " + (p.automaticCheck ? "auto" : "review")}>{evaluation(p)}</span></dd></div>
          </dl>
          <Link className="button primary" href={lessonPath(p.id)}>Open in the Lab <ArrowRight size={16} /></Link>
          <ul className="ticket-links">
            <li><a href={p.source}>Notebook source <ExternalLink size={13} aria-hidden="true" /><span className="sr-only"> (GitHub)</span></a></li>
            {p.package && <li><a href={p.package.source}>Package source <ExternalLink size={13} aria-hidden="true" /><span className="sr-only"> (GitHub)</span></a></li>}
            <li><Link href="/learn/python/roadmap">Python roadmap</Link></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
