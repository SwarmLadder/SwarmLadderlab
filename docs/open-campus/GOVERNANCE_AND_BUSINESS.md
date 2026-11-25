# Open Campus — contribution governance and business boundaries (proposal)

**No licensing changes are authorized by this document.** Confirm ownership and obtain qualified legal review before changing license terms or creating a commercial relicensing arrangement.

## Principle: learning is open, community credit is real, commercial products are explicit

Open educational work:
- Course sources, test specs, roadmaps, source credits, and public project briefs are accessible and welcome contributions wherever the repository's actual license permits them.
- Students may contribute docs, code, test cases, bugs, translations, examples, accessibility improvements, and reviews.
- No formal degree/accreditation claims. Do not imply users are employees, paid contractors, or certified experts from public PR contributions.

Company assets:
- SwarmLadder name/logo, domain, hosting accounts, managed servers, private organization workspaces, customer data and commercially offered services remain under separately documented terms.
- Lab is **currently public and MIT licensed**. Existing releases and third-party forks keep the rights already granted.
- Sustainable options: paid managed Lab, business SSO, organizations/cohorts, support SLAs, private project hosting, consent-based paid assessment/review; or genuinely new proprietary additions in independent modules/repos if their authors have granted appropriate rights.
- Never charge for access to other projects' NC-licensed material without permission. Do not advertise a hosted paid platform as the copyright owner of community contributions.

## First governance decisions requiring human review

1. Publish a clear code/content license matrix for every public SwarmLadder repository. Python uses MIT code + CC BY 4.0 content; do not assume all other repos share those terms.
2. Choose license for currently unlicensed content **only with consent of all relevant copyright holders**. Lack of a license is a reason to pause adaptation, not a reason to declare everything MIT.
3. Decide between (A) MIT Lab + hosted services and (B) separate proprietary enterprise services. Existing MIT contributions do not become private merely because source hosting changes.
4. Choose and publish an appropriate contribution sign-off mechanism (DCO is one option; CLA needs separate justification).
5. Adopt maintainers/CODEOWNERS, a security policy, an anti-harassment Code of Conduct, vulnerability reporting and a clear decision/appeal process.
6. Establish a moderation and privacy model before launching user accounts, project submissions, direct messages or mentor matching.

## Suggested contributor ladder

- Learner: may report confusion and work through open exercises.
- First contributor: first accepted documentation, test or code PR with link and review.
- Contributor: recurring reviewed work.
- Reviewer: demonstrated code review, accurate feedback and respectful conduct.
- Maintainer: scoped ownership of a course or component, responsible for CI and review.
- Mentor: opt-in role with clear capacity and accountability; not automatically inferred from activity.

Every role requires transparent criteria. No automatic promotions based on vanity activity. Public leaderboards should be opt-in, not default. Quality, accessibility and collaboration count alongside code.

## Contributor workflow

- New issue with reproducible description and intended learner impact.
- Label by skill and difficulty; mark availability rather than inventing an assigned mentor.
- Learner forks, implements, tests and opens PR.
- Automated tests run with read-only permissions and no production secrets; consider threat-modeling malicious PR code.
- Human review on learning quality, correctness, accessibility, license provenance, privacy and documentation.
- Approved and merged work is linked back to the learner's portfolio with explicit opt-in.
- Sensitive security reports use private disclosure.

## Sustainable commercial boundary

**Free forever (proposed):** curriculum source, access to self-hosted/open learning, public roadmaps, community contributions, documentation, basic practice and open portfolio evidence.

**Paid where value is provided (proposed):** hosted reliability/storage, private enterprise cohorts, private team projects, management reports, SSO, paid human evaluations, commercial support, enterprise governance/compliance. Do not turn public contributor labor into an implied free staffing promise.

Trust is a product requirement: do not sell learner conversation data; obtain meaningful consent before collecting personal work evidence. Security and retention rules must precede account-backed achievements.

## Initial non-invasive work

- Complete license ownership audit and publish license matrix.
- Publish CONTRIBUTING, CODE_OF_CONDUCT, SECURITY and PR templates in appropriate public repos after policy review.
- Use the source registry for link-only exploration with honest license state.
- Pilot one DSA-to-TheAlgorithms reference path and one Python-to-GitHub contribution path.
- Track first-PR acceptance and review latency rather than repository count.
