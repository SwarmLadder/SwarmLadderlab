import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import studio from "../../../../../public/data/studio.json";
import { experiments, studioSlug } from "../../../../lib/campus";
import { lessonPath } from "../../../../lib/course";

export const dynamicParams = false;
export function generateStaticParams() {
  return experiments.map((e) => ({ id: e.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const e = experiments.find((x) => x.id === id);
  if (!e) notFound();
  const project = (studio as { id: string; title: string }[]).find((p) => p.id === e.project);
  const name = project?.title.replace(/^Project \d+ — /, "") ?? e.project;
  return (
    <div className="ticket shell page-pad">
      <nav className="crumbs-line" aria-label="Breadcrumb">
        <Link href="/studio#research">Research experiments</Link> <span aria-hidden="true">/</span> <span>{e.theme}</span>
      </nav>
      <header className="ticket-head">
        <p className="ticket-key">Open experiment · not a published study</p>
        <h1>{e.question}</h1>
      </header>
      <div className="ticket-body">
        <article className="ticket-main">
          <section aria-labelledby="r-method"><h2 id="r-method">Method</h2><ol>{e.method.map((m) => <li key={m}>{m}</li>)}</ol></section>
          <section aria-labelledby="r-evidence"><h2 id="r-evidence">Evidence to report</h2><p>{e.evidence}</p></section>
          <section aria-labelledby="r-repro">
            <h2 id="r-repro">Make it reproducible</h2>
            <ul>
              <li>Record the Python version, machine and inputs, and fix random seeds.</li>
              <li>Commit the script that produces every number in your report.</li>
              <li>State what your measurements cannot show.</li>
            </ul>
          </section>
        </article>
        <aside className="ticket-side" aria-label="Source project">
          <dl>
            <div><dt>Theme</dt><dd>{e.theme}</dd></div>
            <div><dt>Builds on</dt><dd>{name}</dd></div>
            <div><dt>Section</dt><dd>{e.section}</dd></div>
          </dl>
          <Link className="button primary" href={lessonPath(e.project)}>Open the project <ArrowRight size={16} /></Link>
          <ul className="ticket-links"><li><Link href={"/studio/" + studioSlug(e.project)}>Project brief</Link></li></ul>
        </aside>
      </div>
    </div>
  );
}
