# SwarmLadder Open Campus — architecture proposal (research draft)

**Status:** proposal for review. This PR changes documentation only. It does **not** import third-party content, alter software licenses, rename the platform, deploy a service, or claim accreditation.

## Mission: university of learners, built by learners

Build an open engineering campus where learning leads to independently tested work, peer review, maintainership and mentoring.

**Journey:** Discover → Learn → Practice → Build → Contribute → Review → Maintain → Mentor.

Open Campus is not a collection of links, a copy of TheAlgorithms, a certification mill or a conventional university. It combines (1) structured teaching, (2) verifiable practice, (3) authentic engineering tasks and (4) community review. Evidence should be attached to real code, tests and reviews rather than badge clicks.

## Existing foundation (November 24, 2026)

- Course repositories already cover Python, SQL, DSA, C, Rust, Java, Git and Linux in the Lab; several additional language repositories are placeholders or not yet imported.
- Lab has /schools, /learn, /studio, /community, /playground, progress, roadmaps and in-browser runtimes.
- Python has substantially richer interactive checks than DSA. DSA's standalone curriculum has 36 lessons, 144 drills, 144 quiz questions, 48 problems, 18 examples, six tested projects and three capstones; most new activities do not yet run as first-class browser assessments.
- Lab's current licensing is MIT. Python content uses CC BY 4.0, with code MIT. Some other SwarmLadder repositories have no GitHub-recognized license and must not be labeled MIT by assumption.
- Lab PR #30 addressed upstream course revision pinning and stale SQL counts. Every new source should have a similarly reproducible revision.

## Schools: focus on genuine materials

| School / department | Existing entry points | Expand only after tested content is ready |
| --- | --- | --- |
| Software Engineering | Python, Java, Git, DSA | TypeScript, Go, practical web/backend |
| Systems Engineering | C, Rust, Linux | Networking, architecture, operating systems, compilers |
| Data Engineering | SQL, Python | Data pipelines, statistics, ML foundations |
| Engineering Practice | Git/GitHub, Studio tickets | Reviews, testing, CI, security, maintainership |
| Research Studio | Three existing reproducible experiments | Benchmarks and experiments with linked code |

Do not present AI, security or formal academic qualifications as complete when they are not.

## Product surfaces and responsibilities

1. **Schools / Roadmaps:** original concept graphs with prerequisites and first-class links to current lessons, practice and projects.
2. **Labs:** browser exercises with current-code validation, bounded execution, genuine errors and honest assessment claims. No reference solution injection.
3. **Algorithm Atlas:** curated *original teaching annotations* and optional correctly attributed third-party reference links, preferably revealed after an attempt. Show proof, complexity, assumptions, languages and tests. This is NOT a wholesale TheAlgorithms mirror.
4. **Engineering Forge (extension of /studio):** real GitHub-backed issues and project briefs tagged by skill, difficulty, repository, tests, mentor/reviewer availability and contribution state. No fabricated review/completion status.
5. **Commons (extension of /community):** contribution paths, code review, help, moderation, learner maintainers and transparent recognition. Initial collaboration can remain on GitHub.
6. **Research:** reproducible experiments with a clear question, method, results and code; no invented academic affiliations.
7. **Organizations (future hosted service):** private cohorts, admin reports, workspace management, support and organization-specific integrations. This must not weaken the open learning path.

## Third-party resource integration policy

Use docs/open-campus/sources.json as an initial **research inventory**, not a legal approval or an import list.

Resource modes:
- **Link:** link to the canonical upstream project, with accurate name, author and no copied content. Default for newly researched sources.
- **Curate:** write original SwarmLadder study guidance, mapping a trusted link to a skill and its prerequisite. Keep the learner inside an original SwarmLadder journey.
- **Adapt:** only after a maintainer verifies the exact file/revision/asset license, attributions, modification notices, compatible terms, accessibility, safety and testing. Record provenance in the build.
- **Build native:** original SwarmLadder lessons, project briefs, validation and visualizations are the primary product.

Licenses can differ **within** a repository. An MIT-licensed list does not grant permission to copy all its externally linked material. A permissive license is not an endorsement, trademark license or assurance of code quality. Never execute newly discovered third-party code in the student's assessment worker without explicit review.

MIT OpenCourseWare and the MIT Missing Semester are not MIT software licensed: their educational content commonly has CC BY-NC-SA restrictions; **link only** unless explicit reuse rights and commercial-context review are obtained. roadmap.sh explicitly does not allow redistributing its website content. The Odin Project curriculum is CC BY-NC-SA; its website software is a different license. freeCodeCamp distinguishes software from curriculum content. See sources.json and the primary sources below.

## Proposed data contract

The public campus registry should eventually become a validated, versioned manifest (not magic code embedded in JSX):

~~~json
{
  "resource_id": "thealgorithms-python",
  "canonical_url": "https://github.com/TheAlgorithms/Python",
  "integration_mode": "link",
  "source_revision": null,
  "license_review": "repository_mit_verify_per_file",
  "skills": ["algorithms", "python"],
  "curated_by": null,
  "last_checked": "2026-11-24"
}
~~~

Only entries with review evidence should transition to adapted content. Add a provenance manifest and attribution view to generated assets when actual third-party material is bundled.

## Contribution and review loop

1. Learner opens a concept → passes current checks → selects a real issue matched to those skills.
2. Issue links a clear contract, starter/test workflow, estimated skill level, acceptance criteria and appropriate safety guidance.
3. Student forks and opens a PR; required checks run on untrusted code with least-privilege permissions and **no production secrets**.
4. Reviewer checks correctness, tests, explanation, licensing and compatibility. Review is human; tests do not prove authorship.
5. Merge links the learner to the *actual merged PR*. A code contribution does not by itself confer a degree, employment, payment or project ownership.
6. Good reviewers can apply for maintainer responsibilities, with published standards and escalation paths.

Provide GitHub issue/PR templates, CODEOWNERS, security policy, public review conventions, newcomer issues and contributor guidance on all genuinely open repositories. Offer small docs/tests contributions alongside advanced implementation work.

## Governance and sustainability: two possible models

**Recommended initial model: open curricula + MIT Lab + paid managed hosting.**
Keep open curriculum and the already MIT Lab available. Monetize hosted reliability, private organizations/cohorts, dedicated infrastructure, optional human review, enterprise identity/SSO and support. Existing MIT grants remain valid. Brand/trademarks and services are separately governed.

**Alternative later model: open curricula + distinct private commercial services.**
Place genuinely new proprietary enterprise services in separate private repositories/modules, with clear contributor boundaries and applicable copyright permissions. Do not take community MIT contributions private and describe them as exclusively owned. GitLab documents an analogous open-core separation, but SwarmLadder must choose its own policy.

Contributor terms must be explicit before soliciting major submissions. A DCO can document right-to-contribute without copyright transfer; seek professional advice before any CLA or dual-license strategy. Keep contributor identities, public PR provenance and moderation transparent. Never promise financial compensation absent an actual paid program.

## Incremental implementation plan

**Milestone 0 — legal and governance:** audit each SwarmLadder license, distinguish course text/code, publish contributor rules, review license choice with rights holders, adopt a Code of Conduct, security policy and review ownership.

**Milestone 1 — curated Open Source Atlas (link-only):** ship a data-driven /open-source or /commons/resources catalog from the validated source manifest. Each source displays canonical upstream, role, license review status, curated skill mapping and attribution. No copies.

**Milestone 2 — GitHub-backed contribution hub:** turn /community and /studio into usable issue and PR pathways for *SwarmLadder's own* public repos first. Add real issue discovery, good-first-issue labeling, review checklists, contributor onboarding and anti-abuse controls. Do not create a fake social network.

**Milestone 3 — DSA pilot:** turn the DSA standalone drill/quiz/project banks into real browser learning; add canonical optional TheAlgorithms links for the same concepts and original comparison explanations. Verify stale progress and independent assessment.

**Milestone 4 — two deeper schools:** connect Python→DSA→C/Rust/SQL/Git with concept prerequisites and cross-course projects (CLI, file format, database, algorithms, CI).

**Milestone 5 — community roles and managed SaaS:** opt-in maintainer/reviewer paths, evidence-backed portfolios, organization accounts and paid services with privacy, support and operational controls.

For each milestone: reviewed PR, tests, preview URLs, before/after usability evidence and a clear statement of what remains unimplemented.

## Measures that matter

- Time from a new learner's first exercise to an independently passing task.
- Correctness and stale-state regression rates.
- First accepted community PR and time-to-first-review.
- Percentage of contributions with reproducible tests.
- Maintainer load and review fairness.
- Learner success on unfamiliar transfer problems and cross-course projects.
- Retention without compulsion or misleading credential claims.

Avoid vanity measures such as badge count, repo count and imported-source count.

## Primary sources

- TheAlgorithms Python, MIT + contributions: https://github.com/TheAlgorithms/Python
- OSSU Computer Science (index; linked course licenses vary): https://github.com/ossu/computer-science
- Exercism Python track, MIT; platform source separately licensed: https://github.com/exercism/python
- Rustlings, MIT: https://github.com/rust-lang/rustlings
- freeCodeCamp software/curriculum license distinctions: https://github.com/freeCodeCamp/freeCodeCamp
- The Odin Project curriculum, CC BY-NC-SA: https://github.com/TheOdinProject/curriculum/blob/main/license.md
- MIT OpenCourseWare reuse conditions: https://mitocw.zendesk.com/hc/en-us/articles/5093047407771-Reusing-MIT-OpenCourseWare-Content
- Missing Semester (CC BY-NC-SA): https://github.com/missing-semester/missing-semester
- roadmap.sh content restrictions: https://roadmap.sh/about/
- GitHub's no-license explanation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
- Developer Certificate of Origin: https://developercertificate.org/
- Contributor Covenant: https://www.contributor-covenant.org/
- GitLab open-core example: https://handbook.gitlab.com/handbook/company/stewardship/

**Important:** This is a technical/product research document, not legal advice. Exact rights must be reviewed before distribution, commercial adaptation or any change of existing license.
