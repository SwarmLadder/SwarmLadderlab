import Link from "next/link";
import { ArrowUpRight, GitPullRequest, LifeBuoy, MessageSquareCode } from "lucide-react";
import { pathways } from "../../lib/campus";

export const metadata = { title: "Community · SwarmLadder Lab" };

const Out = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a href={href} className={className}>{children} <ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only"> (GitHub)</span></a>
);

export default function Page() {
  return (
    <div className="community shell page-pad">
      <header className="community-head">
        <p className="eyebrow">Community</p>
        <h1 className="display small">Learn in the open. <em>Review each other.</em></h1>
        <p className="lede">The courses and the Lab are built in public on GitHub. That is where you ask, contribute and review.</p>
      </header>

      <ol className="community-actions">
        <li>
          <LifeBuoy size={22} aria-hidden="true" />
          <h2>Ask for help</h2>
          <p>Stuck on a lesson, an exercise or a test message? Open an issue in the Python course and describe your idea rather than pasting a full solution.</p>
          <Out href={pathways.ask} className="button primary">Ask a question</Out>
        </li>
        <li>
          <GitPullRequest size={22} aria-hidden="true" />
          <h2>Contribute to a project</h2>
          <p>Fix a mistake, clarify a lesson or add an exercise. Merged pull requests are credited automatically in the contributors list.</p>
          <Out href={pathways.contributing} className="button quiet">Contribution guide</Out>
        </li>
        <li>
          <MessageSquareCode size={22} aria-hidden="true" />
          <h2>Review someone&apos;s code</h2>
          <p>Studio projects are reviewed by peers. Use the guide below and keep feedback specific to the acceptance criteria.</p>
          <Link href="#review" className="button quiet">Review guide</Link>
        </li>
      </ol>

      <div className="community-grid">
        <section id="review" aria-labelledby="c-review" className="community-review">
          <h2 id="c-review">Peer code review</h2>
          <ol>
            <li><b>Start from the acceptance criteria.</b> Say which pass, citing a test or an example run.</li>
            <li><b>Run the code.</b> Reproduce what you report, with the input and the actual output.</li>
            <li><b>Look for missing cases.</b> Empty input, invalid values, boundaries, failure part-way through.</li>
            <li><b>Explain, don&apos;t rewrite.</b> Point to the line and describe the problem; leave the fix to the author.</li>
            <li><b>Separate must-fix from suggestions.</b> Say which comments block the work and which are optional.</li>
          </ol>
          <p>Projects and their criteria are listed in the <Link href="/studio">Engineering Studio</Link>.</p>
        </section>

        <aside className="community-side" aria-label="More ways to take part">
          <section aria-labelledby="c-work">
            <h2 id="c-work">Open work</h2>
            <ul>
              <li><Out href={pathways.courseIssues}>Course issues</Out></li>
              <li><Out href={pathways.coursePulls}>Course pull requests</Out></li>
              <li><Out href={pathways.labIssues}>Lab issues</Out></li>
              <li><Out href={pathways.fix}>Report a content problem</Out></li>
            </ul>
          </section>
          <section aria-labelledby="c-recognition">
            <h2 id="c-recognition">Recognition</h2>
            <p>Complete a level&apos;s practice modules and claim it with a pull request; a workflow re-runs the tests before your name is added.</p>
            <ul>
              <li><Out href={pathways.recognition}>Recognition rules</Out></li>
              <li><Out href={pathways.achievements}>Achievements list</Out></li>
              <li><Out href={pathways.contributors}>Contributors</Out></li>
            </ul>
          </section>
        </aside>
      </div>

      <div className="community-rules">
        <section aria-labelledby="c-standards">
          <h2 id="c-standards">Community standards</h2>
          <ul>
            <li>Be respectful and specific; criticise code, not people.</li>
            <li>Submitted work must be your own. Discussing ideas is fine; copying solutions is not.</li>
            <li>Don&apos;t post full solutions where others are still learning.</li>
            <li>Never share secrets, credentials or other people&apos;s personal data.</li>
          </ul>
        </section>
        <section aria-labelledby="c-report">
          <h2 id="c-report">Reporting a problem</h2>
          <p>Report abuse or spam in an issue or pull request with GitHub&apos;s &ldquo;Report content&rdquo; option; maintainers can hide, lock or remove content in the repositories.</p>
          <p><Out href={pathways.reporting}>How reporting works on GitHub</Out></p>
        </section>
      </div>

      <p className="campus-note">Not available yet: mentoring, study groups, member profiles and direct messages. They need accounts, privacy and moderation design first.</p>
    </div>
  );
}
