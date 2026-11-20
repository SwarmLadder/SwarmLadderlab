"""Build complete Git and Rust activity catalogs from the upstream curricula.

These courses teach real native CLI skills. The Lab reads and saves exercises;
the browser is *not* a native Git or Rust process and cannot auto-grade them.
Checked activities are explicitly marked "verified locally" by the learner.
"""
from __future__ import annotations

import html
import json
import posixpath
import re
from pathlib import Path
from urllib.parse import quote, urlsplit

import markdown

LEVELS = (("basics", "Basics", "🥉"), ("intermediate", "Intermediate", "🥈"),
          ("advanced", "Advanced", "🥇"))
REPOS = {"git": "https://github.com/SwarmLadder/git-github-course",
         "rust": "https://github.com/SwarmLadder/RUST"}
MASTER = {
    "basics": [("B01", "parse_port"), ("B02", "unicode_window"),
               ("B03", "mean_truncated"), ("B04", "word_frequency")],
    "intermediate": [("I01", "parse_settings"), ("I02", "by_initial"),
                     ("I03", "normalize_ranges"), ("I04", "top_k_scores")],
    "advanced": [("A01", "read_frames"), ("A02", "parallel_histogram"),
                 ("A03", "apply_changes"), ("A04", "reserve_capacity")],
}


def heading(text: str) -> str:
    return text.splitlines()[0].removeprefix("# ").strip()


def first_code(text: str, lang: str) -> str:
    match = re.search(r"(?ms)^```" + re.escape(lang) + r"\s*\n(.*?)\n```", text)
    return match.group(1).strip() if match else ""


def html_guide(md: str, source_path: str, repo: str) -> str:
    """Rewrite source-relative Markdown links for the static Lab routes."""
    result = markdown.markdown(md, extensions=["fenced_code", "tables", "sane_lists"])
    result = re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", result, count=1, flags=re.S)
    folder = posixpath.dirname(source_path)

    def fix(match: re.Match) -> str:
        before, href, after = match.groups()
        if href.startswith(("https://", "http://", "#", "/", "mailto:", "data:")):
            return match.group(0)
        parts = urlsplit(html.unescape(href))
        if parts.scheme or parts.netloc:
            return match.group(0)
        dest = posixpath.normpath(posixpath.join(folder, parts.path))
        if dest == ".." or dest.startswith("../"):
            return match.group(0)
        url = repo + "/blob/main/" + quote(dest, safe="/")
        if parts.fragment:
            url += "#" + quote(parts.fragment, safe="-_")
        return before + html.escape(url, quote=True) + after
    return re.sub(r'(<a\s+[^>]*?href=")([^"]+)(")', fix, result)


def functions(text: str) -> list[tuple[str, str]]:
    """Read curated starter stubs. This deliberately is not a general Rust parser."""
    found = []
    for match in re.finditer(r"(?m)^\s*pub fn\s+([A-Za-z_]\w*)", text):
        opening = text.find("{", match.end())
        if opening < 0:
            raise ValueError(f"Unterminated starter: {match.group(1)}")
        depth, end = 0, -1
        for at in range(opening, len(text)):
            if text[at] == "{":
                depth += 1
            if text[at] == "}":
                depth -= 1
                if depth == 0:
                    end = at + 1
                    break
        if end < 0:
            raise ValueError(f"Unterminated starter: {match.group(1)}")
        found.append((match.group(1), text[match.start():end].strip()))
    if len({name for name, _ in found}) != len(found):
        raise ValueError("Duplicate public starter name")
    return found


def add(entries: dict, course: str, level: str, kind: str, slug: str,
        label: str, md: str, path: str, *, code: str = "", check: str = "",
        start: str = "", graded: bool = False, hint: str = "") -> dict:
    uid = f"{course}/{level}/{kind}/{slug}"
    if uid in entries:
        raise ValueError(f"Duplicate activity {uid}")
    entries[uid] = {
        "id": uid, "title": label, "guideHtml": html_guide(md, path, REPOS[course]),
        "sourcePath": path, "source": code, "checkCommand": check,
        "practiceCommand": start, "graded": ["self-reported"] if graded else [],
        "mode": "local-git" if course == "git" else "local-rust", "hint": hint,
    }
    return {"id": uid, "title": label, "graded": int(graded)}


def output(out: Path, name: str, entries: dict, catalog: dict) -> dict:
    root = out / "data" / name
    (root / "nb").mkdir(parents=True, exist_ok=True)
    for uid, item in entries.items():
        (root / "nb" / (uid.replace("/", "__") + ".json")).write_text(
            json.dumps(item, ensure_ascii=False, indent=1), encoding="utf-8")
    (root / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
    return catalog


def build_git(course: Path, out: Path) -> dict:
    course = course.resolve()
    task_path = course / "practice/tasks.json"
    if not task_path.is_file():
        raise FileNotFoundError(f"Missing enriched Git curriculum: {course}")
    tasks = json.loads(task_path.read_text(encoding="utf-8"))
    if len(tasks) != 24:
        raise ValueError(f"Expected 24 Git labs, got {len(tasks)}")
    interview = (course / "interview/QUESTIONS.md").read_text(encoding="utf-8")
    entries: dict[str, dict] = {}
    catalog = {"course": REPOS["git"], "levels": [], "workbooks": {}}

    for level, label, medal in LEVELS:
        guides = []
        for path in sorted((course / level / "lessons").glob("[0-9][0-9]_*.md")):
            md = path.read_text(encoding="utf-8")
            guides.append(add(entries, "git", level, "lessons", path.stem,
                              heading(md), md, path.relative_to(course).as_posix(),
                              code=first_code(md, "bash")))
        if len(guides) != 12:
            raise ValueError(f"Git {level}: expected 12 lessons")

        labs = []
        for task in tasks:
            if task["level"] != level:
                continue
            name = task["id"]
            start = f"python tools/practice.py start {name}"
            check = f"python tools/practice.py check {name}"
            md = (f"# {name}: {task['title']}\n\n**Goal:** {task['goal']}\n\n"
                  "**Native Git practice.** The browser does not execute these commands. "
                  "The source Git course generates a disposable local repository and "
                  "checks actual Git state; do not run destructive commands in a "
                  "real project.\n\n```bash\n"
                  f"{start}\n# Follow the goal inside .practice/{name}/repo\n{check}\n"
                  "```\n\nMark complete here **only after your terminal reports PASS**. "
                  "Lab progress is a learner confirmation, not a server-verified result.")
            labs.append(add(entries, "git", level, "labs", name,
                            f"{name} — {task['title']}", md, "practice/tasks.json",
                            code=start + "\n" + check, check=check, start=start,
                            hint=task["hint"], graded=True))
        if len(labs) != 8:
            raise ValueError(f"Git {level}: expected 8 labs")

        match = re.search(rf"(?ms)^## {label}\s*\n(.*?)(?=^## |\Z)", interview)
        if not match:
            raise ValueError(f"Git interview section missing: {label}")
        pairs = re.findall(
            r"(?ms)^\d+\.\s+\*\*(.+?)\*\*\s*(.*?)(?=^\d+\.\s+\*\*|\Z)",
            match.group(1))
        if len(pairs) != 15:
            raise ValueError(f"Git {level}: expected 15 interview Q&As")
        qa = []
        for n, (question, answer) in enumerate(pairs, 1):
            md = (f"# Interview {n:02}: {question}\n\nExplain your answer before "
                  "revealing the course explanation.\n\n<details><summary>Reveal "
                  "explained answer</summary>\n\n" + answer.strip() + "\n\n</details>")
            qa.append(add(entries, "git", level, "interview", f"{n:02}",
                          f"Interview {n:02} — {question}", md, "interview/QUESTIONS.md"))
        workshops = []
        for n in ({"basics": (1, 2), "intermediate": (3, 4),
                   "advanced": (5, 6)}[level]):
            files = list((course / "workshops").glob(f"{n:02}_*.md"))
            if len(files) != 1:
                raise ValueError(f"Git workshop missing: {n}")
            file = files[0]
            md = file.read_text(encoding="utf-8")
            workshops.append(add(entries, "git", level, "workshops", file.stem,
                                 heading(md), md, file.relative_to(course).as_posix(),
                                 code=first_code(md, "bash")))
        project_number = {"basics": "01", "intermediate": "02", "advanced": "03"}[level]
        files = list((course / "projects").glob(f"{project_number}_*.md"))
        if len(files) != 1:
            raise ValueError(f"Git project missing: {project_number}")
        file = files[0]
        md = file.read_text(encoding="utf-8")
        projects = [add(entries, "git", level, "projects", file.stem,
                        heading(md), md, file.relative_to(course).as_posix())]
        sections = [
            {"id": "notebooks", "title": "Guided Git lessons", "items": guides},
            {"id": "exercises", "title": "Offline graded Git labs", "items": labs},
            {"id": "worked_examples", "title": "Interview answers", "items": qa},
            {"id": "worked_examples", "title": "Applied workshops", "items": workshops},
            {"id": "projects", "title": "Portfolio project", "items": projects},
        ]
        catalog["levels"].append({"id": level, "title": label, "medal": medal,
                                  "sections": sections, "total": len(labs)})
    return output(out, "git", entries, catalog)


def build_rust(course: Path, out: Path) -> dict:
    course = course.resolve()
    if not (course / "mastery/starter.rs").is_file():
        raise FileNotFoundError(f"Enriched Rust curriculum missing: {course}")
    study = dict(functions((course / "src/exercises.rs").read_text(encoding="utf-8")))
    mastery = dict(functions((course / "mastery/starter.rs").read_text(encoding="utf-8")))
    if len(study) != 8 or len(mastery) != 12:
        raise ValueError("Expected eight study-log and twelve mastery functions")
    study_names = ("blocks", "title", "parse_entry", "summarize",
                   "sessions", "totals", "render", "report")
    portfolio = (course / "PORTFOLIO.md").read_text(encoding="utf-8")
    milestones = re.split(r"(?m)^## Milestone \d+ — ", portfolio)[1:]
    if len(milestones) != 3:
        raise ValueError("Expected three Rust portfolio milestones")
    entries: dict[str, dict] = {}
    catalog = {"course": REPOS["rust"], "levels": [], "workbooks": {}}

    for level_index, (level, label, medal) in enumerate(LEVELS):
        guides = []
        for number in range(1, 5):
            path = course / level / f"workshop-{number}.md"
            md = path.read_text(encoding="utf-8")
            guides.append(add(entries, "rust", level, "guides", f"workshop-{number}",
                              heading(md), md, path.relative_to(course).as_posix(),
                              code=first_code(md, "rust")))
        for path in sorted((course / level / "practice").glob("*.md")):
            md = path.read_text(encoding="utf-8")
            guides.append(add(entries, "rust", level, "guides", path.stem,
                              heading(md), md, path.relative_to(course).as_posix(),
                              code=first_code(md, "rust")))
        if len(guides) != 12:
            raise ValueError(f"Rust {level}: expected 12 workshop guides")
        path = course / "mastery" / f"{level}.md"
        md = path.read_text(encoding="utf-8")
        guides.append(add(entries, "rust", level, "guides", f"mastery-{level}",
                          heading(md), md, path.relative_to(course).as_posix(),
                          code=first_code(md, "rust")))

        challenges = []
        core = functions((course / level / "exercises.rs").read_text(encoding="utf-8"))
        if len(core) != 12:
            raise ValueError(f"Rust {level}: expected 12 guided exercise functions")
        for name, snippet in core:
            md = (f"# {name}\n\nImplement the function in `{level}/exercises.rs`. "
                  "This editor saves a draft; real Rust compilation and grading "
                  "run with Cargo on your computer, **not inside this browser**.")
            challenges.append(add(entries, "rust", level, "core", name,
                                  name.replace("_", " ").title(), md,
                                  f"{level}/exercises.rs", code=snippet,
                                  check=f"cargo test --test {level} {name} -- --exact",
                                  graded=True))
        for file in sorted((course / level / "practice/starter").glob("*.rs")):
            guide = course / level / "practice" / (file.stem + ".md")
            if not guide.exists():
                raise FileNotFoundError(guide)
            md = guide.read_text(encoding="utf-8")
            extracted = functions(file.read_text(encoding="utf-8"))
            if len(extracted) != 5:
                raise ValueError(f"Expected 5 Rust functions in {file}")
            for name, snippet in extracted:
                challenges.append(add(entries, "rust", level, "practice",
                                      f"{file.stem}/{name}",
                                      name.replace("_", " ").title(), md,
                                      file.relative_to(course).as_posix(),
                                      code=snippet,
                                      check=f"cargo test --test {level}_practice {name} -- --exact",
                                      graded=True))
        if len(challenges) != 52:
            raise ValueError(f"Rust {level}: expected 52 challenges, got {len(challenges)}")

        master_challenges = []
        for task, name in MASTER[level]:
            if name not in mastery:
                raise ValueError(f"Missing mastery function {name}")
            master_challenges.append(add(entries, "rust", level, "mastery", task,
                                         f"{task} — {name.replace('_', ' ').title()}", md,
                                         "mastery/starter.rs", code=mastery[name],
                                         check=f"cargo test --test mastery {task.lower()}_",
                                         graded=True))

        study_pages = []
        if level != "advanced":
            for n in range(1 if level == "basics" else 5,
                           5 if level == "basics" else 9):
                files = list((course / "lessons").glob(f"{n:02}-*.md"))
                if len(files) != 1:
                    raise ValueError(f"Rust study-log lesson missing: {n}")
                file = files[0]
                md = file.read_text(encoding="utf-8")
                study_pages.append(add(entries, "rust", level, "study-log",
                                       f"{n:02}", heading(md), md,
                                       file.relative_to(course).as_posix(),
                                       code=study[study_names[n - 1]],
                                       check=f"cargo test lesson{n}", graded=True))

        projects = []
        for file in sorted((course / level / "projects").glob("*.md")):
            md = file.read_text(encoding="utf-8")
            projects.append(add(entries, "rust", level, "projects", file.stem,
                                heading(md), md, file.relative_to(course).as_posix(),
                                check=f"cargo test --test {level}_projects"))
        if len(projects) != 3:
            raise ValueError(f"Rust {level}: expected three projects")
        milestone_md = "## Milestone " + str(level_index + 1) + " — " + milestones[level_index]
        projects.append(add(entries, "rust", level, "portfolio", f"milestone-{level_index+1}",
                            "Mastery portfolio milestone", milestone_md, "PORTFOLIO.md"))

        sections = [
            {"id": "notebooks", "title": "Workshops & mastery guides", "items": guides},
            {"id": "exercises", "title": "52 functions & four mastery challenges",
             "items": challenges + master_challenges},
            {"id": "worked_examples", "title": "Study-log project lessons",
             "items": study_pages},
            {"id": "projects", "title": "Projects & portfolio", "items": projects},
        ]
        catalog["levels"].append({"id": level, "title": label, "medal": medal,
                                  "sections": sections,
                                  "total": len(challenges) + len(master_challenges) +
                                           len(study_pages)})
    return output(out, "rust", entries, catalog)
