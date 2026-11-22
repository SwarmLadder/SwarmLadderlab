import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { pathways } from "../../lib/campus";
import { JourneyNav } from "../../features/campus/Schools";

export const metadata = { title: "Community · SwarmLadder Lab" };

const Out = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href}>{children} <ExternalLink size={13} aria-hidden="true" /><span className="sr-only"> (GitHub)</span></a>
);

export default function Page() {
  return (
    <div className="campus shell page-pad">
      <header className="campus-hero">
        <p className="eyebrow">Swarm Campus · Community</p>
        <h1 className="display small">Learn in the open, <em>review each other.</em></h1>
        <p className="lede">
          Collaboration happens on GitHub, where the courses and the Lab are developed in public.
          The Lab itself has no accounts, profiles or messaging.
        </p>
        <JourneyNav here="/community" />
      </header>

      <div className="community-grid">
        <section aria-labelledby="c-ask">
          <h2 id="c-ask">Ask for help</h2>
          <p>Stuck on a lesson, an exercise or a test message? Open an issue in the Python course. Describe your idea instead of pasting a full solution.</p>
          <p><Out href={pathways.ask}>Ask a question</Out></p>
        </section>

        <section aria-labelledby="c-contribute">
          <h2 id="c-contribute">Improve the courses</h2>
          <p>Fix a mistake, clarify a lesson or add an exercise. Merged pull requests are credited automatically in the contributors list.</p>
          <ul>
            <li><Out href={pathways.fix}>Report a content problem</Out></li>
            <li><Out href={pathways.contributing}>Contribution guide</Out></li>
            <li><Out href={pathways.courseIssues}>Open course issues</Out> · <Out href={pathways.labIssues}>Open Lab issues</Out></li>
            <li><Out href={pathways.contributors}>Contributors</Out></li>
          </ul>
        </section>

        <section aria-labelledby="c-recognition">
          <h2 id="c-recognition">Get recognised</h2>
          <p>
            Complete a level's practice modules and claim it with a pull request. A workflow re-runs the
            tests on your solutions before your name is added to the achievements list.
          </p>
          <ul>
            <li><Out href={pathways.recognition}>Recognition rules</Out></li>
            <li><Out href={pathways.achievements}>Achievements list</Out></li>
          </ul>
        </section>

        <section aria-labelledby="c-review" className="community-wide">
          <h2 id="c-review">Peer code review</h2>
          <p>When you review someone&apos;s project, or ask for a review of yours:</p>
          <ol>
            <li><b>Start from the acceptance criteria.</b> Check each one and say which pass, citing a test or an example run.</li>
            <li><b>Run the code.</b> Reproduce what you report; include the input and the actual output.</li>
            <li><b>Look for missing cases.</b> Empty input, invalid values, boundaries, failure part-way through.</li>
            <li><b>Explain, don&apos;t rewrite.</b> Point to the line and describe the problem. Leave the fix to the author.</li>
            <li><b>Separate must-fix from suggestions.</b> Say which comments block the work and which are optional.</li>
          </ol>
          <p>Projects, their criteria and their tests are listed in the <Link href="/studio">Engineering Studio</Link>.</p>
        </section>

        <section aria-labelledby="c-standards">
          <h2 id="c-standards">Community standards</h2>
          <ul>
            <li>Be respectful and specific; criticise code, not people.</li>
            <li>Your submitted work must be your own. Discussing ideas is fine; copying solutions is not.</li>
            <li>Don&apos;t post full solutions in issues where others are still learning.</li>
            <li>Never share secrets, credentials or other people&apos;s personal data.</li>
          </ul>
        </section>

        <section aria-labelledby="c-report">
          <h2 id="c-report">Reporting a problem</h2>
          <p>
            Abuse or spam in an issue or pull request can be reported to GitHub with the comment&apos;s
            “Report content” option. Maintainers can hide, lock or remove content in the repositories.
          </p>
          <p><Out href={pathways.reporting}>How reporting works on GitHub</Out></p>
        </section>
      </div>

      <p className="campus-note">
        Not available yet: mentoring programmes, study groups, member profiles and direct messages.
        They need accounts, privacy and moderation design first, and are planned as a separate milestone.
      </p>
    </div>
  );
}
