#!/usr/bin/env python3
"""Build the SwarmLadderlab static site from the python-notebook course.

    python build/build_site.py --course ../python-notebook --out dist

Output (dist/):
  data/catalog.json        levels -> sections -> notebooks, plus totals for progress
  data/nb/<id>.json        one notebook: rendered Markdown and code cells
  course/...               the helper files Python needs in the browser (lesson.py,
                           quiz.py, check.py, practice/, data files...)
  data/course-files.json   list of those files, loaded into Pyodide's file system
"""
from __future__ import annotations

import argparse
import ast
import json
import posixpath
import re
import subprocess
import shutil
import sys
from pathlib import Path

import markdown

HERE = Path(__file__).resolve().parent
COURSE_REPO_URL = "https://github.com/SwarmLadder/python-notebook"
LEVELS = [("basics", "Basics", "🥉"), ("intermediate", "Intermediate", "🥈"), ("advanced", "Advanced", "🥇")]
SECTIONS = [("notebooks", "Lessons"), ("exercises", "Workbooks"), ("worked_examples", "Worked examples"), ("projects", "Projects")]
WEB_PYTEST_INI = """[pytest]
# Browser version of the course's pytest.ini (Pyodide has no faulthandler watchdog thread).
testpaths = practice/tests
addopts = --import-mode=importlib -rfE -p no:faulthandler -p no:cacheprovider
"""


def notebook_id(path: Path, course: Path) -> str:
    return path.relative_to(course).with_suffix("").as_posix()


def cell_text(cell: dict) -> str:
    source = cell.get("source", "")
    return "".join(source) if isinstance(source, list) else source


def rewrite_links(html: str, nb_path: str) -> str:
    """Turn links to other notebooks into site links and other repo links into GitHub links."""
    folder = posixpath.dirname(nb_path)

    def fix(match):
        attr, url = match.group(1), match.group(2)
        if re.match(r"[a-z]+:|#|/", url):
            return match.group(0)
        target, _, anchor = url.partition("#")
        resolved = posixpath.normpath(posixpath.join(folder, target))
        if resolved.endswith(".ipynb"):
            new = "/lesson/" + resolved[:-len(".ipynb")]
        elif resolved.endswith("/") or "." not in posixpath.basename(resolved):
            new = f"{COURSE_REPO_URL}/tree/main/{resolved.rstrip('/')}"
        else:
            new = f"{COURSE_REPO_URL}/blob/main/{resolved}"
        return f'{attr}="{new}{"#" + anchor if anchor else ""}"'

    return re.sub(r'(href|src)="([^"]+)"', fix, html)


def classify_code(cell: dict, text: str) -> str:
    cell_id = cell.get("id", "")
    if cell_id == "colab-setup":
        return "colab"
    if cell_id == "build-check":
        return "check"
    if cell_id == "engineering-work":
        return "engineering"
    if cell_id == "quiz-check":
        return "quiz"
    # Lesson exercises are recognised by content, so both layouts work: the older
    # "Try it" section and teach-then-test lessons with exercises after each part.
    if "Exercises(" in text:
        return "setup"
    if re.search(r"\bcheck\(\d+, ", text):
        return "exercise"
    if text.lstrip().startswith("check(") or text.lstrip().startswith("check.summary"):
        return "check"
    if "from check import Checker" in text:
        return "setup"
    return "code"


def convert_notebook(path: Path, course: Path) -> dict:
    nb = json.loads(path.read_text(encoding="utf-8"))
    nb_id = notebook_id(path, course)
    md = markdown.Markdown(extensions=["fenced_code", "tables", "sane_lists"])
    cells = []
    seen = set()
    title = None
    for index, cell in enumerate(nb["cells"]):
        text = cell_text(cell)
        if cell["cell_type"] == "markdown":
            if title is None and text.lstrip().startswith("# "):
                title = text.lstrip()[2:].splitlines()[0].strip()
            html = rewrite_links(md.reset().convert(text), path.relative_to(course).as_posix())
            cells.append({"type": "md", "html": html})
        elif cell["cell_type"] == "code":
            kind = classify_code(cell, text)
            if kind == "colab":
                continue  # the browser already has every course file
            cell_id = cell["id"]
            deps = cell.get("metadata", {}).get("requires_cells", [])
            if not isinstance(deps, list) or any(d not in seen for d in deps):
                raise ValueError(f"{path}:{cell_id} requires an earlier executable cell: {deps}")
            if cell_id in seen:
                raise ValueError(f"{path}: duplicate cell {cell_id}")
            if (cell_id == "build-check" or re.fullmatch(r"ch-\d+-check", cell_id)) and not deps:
                raise ValueError(f"{path}:{cell_id} has no declared submission")
            seen.add(cell_id)
            key = None
            if kind == "exercise":
                key = "ex" + re.search(r"\bcheck\((\d+),", text)[1]
            elif kind == "check":
                named = re.search(r"""\bcheck(\.assess)?\(\s*['"]([^'"]+)['"]""", text)
                if named:
                    key = ("mastery:" if named[1] else "wb:") + named[2]
            cells.append({"type": "code", "id": cell_id, "kind": kind, "source": text,
                          "requires_cells": deps, "assessment": key})
    return {"id": nb_id, "title": title or path.stem, "folder": posixpath.dirname(nb_id), "cells": cells}


def lesson_totals(nb: dict) -> dict:
    """Counts of graded items in a notebook, keyed like the progress the site stores."""
    keys = []
    for cell in nb["cells"]:
        if cell["type"] != "code":
            continue
        if cell["kind"] == "setup" and "Exercises(" in cell["source"]:
            match = re.search(r"Exercises\('[^']+', (\{[^}]*\})", cell["source"])
            keys += [f"ex{n}" for n in sorted(ast.literal_eval(match.group(1)))]
        elif cell["kind"] == "quiz":
            match = re.search(r"Quiz\('[^']+', (\{.*?\})\)", cell["source"])
            keys += [f"q{n}" for n in sorted(ast.literal_eval(match.group(1)))]
        elif cell.get("assessment", "") and cell["assessment"].startswith("mastery:"):
            keys.append(cell["assessment"])
        elif cell["kind"] == "check":
            match = re.match(r"\s*check\('([^']+)'\)", cell["source"])
            if match:
                keys.append(f"wb:{match.group(1)}")
    return keys


def course_files(course: Path) -> list[Path]:
    files = [course / "conftest.py"]
    for level, _, _ in LEVELS:
        files += [course / level / "notebooks" / name for name in ("lesson.py", "quiz.py")]
        files.append(course / level / "exercises" / "check.py")
        files += sorted(p for p in (course / level / "data").glob("*") if p.is_file())
        files += [course / level / "README.md"]  # some notebooks look for ../README.md
    practice = course / "practice"
    for sub in ("", "tests", "answers", "hints", "exercises"):
        folder = practice / sub if sub else practice
        files += sorted(p for p in folder.glob("*") if p.is_file() and p.suffix in {".py", ".json"}
                        and p.name != ".progress.json")
    return [f for f in files if f.exists()]


def workbook_modules(course: Path) -> dict:
    """For the claim page: each workbook's practice module and its checkable exercises."""
    sys.path.insert(0, str(course / "practice"))
    from notebook_check import tests_by_exercise
    result = {}
    for level, _, _ in LEVELS:
        for workbook in sorted((course / level / "exercises").glob("*_exercises.ipynb")):
            number = workbook.name.split("_", 1)[0]
            module = sorted((course / "practice" / "exercises").glob(f"{level}_{number}_*.py"))[0].stem
            checkable = [name for name, tests in tests_by_exercise(module).items() if tests]
            result[notebook_id(workbook, course)] = {"module": module, "level": level, "exercises": checkable}
        # Levels whose challenges live inside the lessons: Exercises(..., practice='module')
        # plus check('name') cells. Each challenge remembers the lesson that holds it.
        packs: dict[str, dict] = {}
        for lesson in sorted((course / level / "notebooks").glob("*.ipynb")):
            cells = [cell_text(c) for c in json.loads(lesson.read_text(encoding="utf-8"))["cells"] if c["cell_type"] == "code"]
            setup = next((c for c in cells if "Exercises(" in c), "")
            found = re.search(r"practice='(\w+)'", setup)
            if not found:
                continue
            module = found.group(1)
            pack = packs.setdefault(module, {"module": module, "level": level, "title": pack_title(course, module),
                                             "exercises": [], "lessons": {}})
            for cell in cells:
                challenge = re.fullmatch(r"\s*check\('(\w+)'\)\s*", cell)
                if challenge:
                    pack["exercises"].append(challenge.group(1))
                    pack["lessons"][challenge.group(1)] = notebook_id(lesson, course)
        for module, pack in packs.items():
            checkable = {name for name, tests in tests_by_exercise(module).items() if tests}
            pack["exercises"] = [name for name in pack["exercises"] if name in checkable]
            result["pack:" + module] = pack
    return result


def pack_title(course: Path, module: str) -> str:
    """'Basics practice 1 — Fundamentals (variables, ...)' -> 'Fundamentals'."""
    text = (course / "practice" / "exercises" / f"{module}.py").read_text(encoding="utf-8")
    match = re.search(r"practice \d+ — ([^(\n]+)", text)
    return match.group(1).strip().rstrip(".") if match else module


# The Engineering Studio lists the curriculum's real projects. Everything shown is
# read from the project notebooks and READMEs; nothing is written by the Lab.
STUDIO_ACCEPTANCE = re.compile(r"(rubric|checklist)", re.I)
STUDIO_SCOPE = re.compile(r"^(deliverables|requirements|project requirements|you will learn)$", re.I)


def _bullets(text: str) -> list[str]:
    items = []
    for line in text.splitlines():
        match = re.match(r"\s*[-*]\s+(?:\[ \]\s+)?(.+)", line)
        if match:
            items.append(re.sub(r"\*\*|`", "", match[1]).strip())
    return items


def _readme_skills(course: Path) -> dict[str, str]:
    """'Main skills' / 'Key skills' columns of the level project READMEs, by notebook path."""
    skills = {}
    for readme in course.glob("*/projects/README.md"):
        for line in readme.read_text(encoding="utf-8").splitlines():
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            link = re.search(r"\(([^)]+\.ipynb)\)", line)
            if len(cells) >= 3 and link:
                skills[f"{readme.parent.relative_to(course).as_posix()}/{link[1]}"] = cells[1]
    return skills


def _sentences(text: str) -> list[str]:
    text = re.sub(r"\*\*|`", "", text).strip()
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+(?=[A-Z`])", text) if part.strip()]


def studio_projects(course: Path) -> list[dict]:
    skills = _readme_skills(course)
    projects = []
    for level, _, _ in LEVELS:
        for path in sorted((course / level / "projects").glob("*.ipynb")):
            nb = json.loads(path.read_text(encoding="utf-8"))
            relative = path.relative_to(course).as_posix()
            text = "\n\n".join(cell_text(c) for c in nb["cells"] if c["cell_type"] == "markdown")
            code = [cell_text(c) for c in nb["cells"] if c["cell_type"] == "code"]
            # Split the notebook's prose into its "## " sections; the text before the
            # first one is the title, the brief and the level/prerequisite line.
            parts = re.split(r"(?m)^## ", text)
            intro = [p.strip() for p in parts[0].split("\n\n") if p.strip()]
            sections = {chunk.split("\n", 1)[0].strip(): chunk.split("\n", 1)[1] if "\n" in chunk else "" for chunk in parts[1:]}
            title = intro[0].lstrip("# ").strip()
            brief = re.sub(r"\*\*Goal:\*\*\s*", "", intro[1]) if len(intro) > 1 else ""
            meta = " ".join(intro[2:])
            prerequisite = re.search(r"\*\*(?:Prerequisite|Requirements):\*\*\s*([^·*]+)", meta)
            scope = next((_bullets(body) for head, body in sections.items() if STUDIO_SCOPE.match(head)), [])
            acceptance = next((_bullets(body) for head, body in sections.items() if STUDIO_ACCEPTANCE.search(head)), [])
            if not acceptance:
                evidence = re.search(r"\*\*(?:Acceptance criteria|Review evidence)\.\*\*\s*(.+?)(?:\n\n|$)", text, re.S)
                acceptance = _sentences(evidence[1]) if evidence else []
            raw = path.read_text(encoding="utf-8")
            package = next((p for p in sorted(path.parent.glob("*_package")) if (p / "tests").is_dir() and p.name in raw), None)
            projects.append({
                "id": notebook_id(path, course),
                "level": level,
                "title": title,
                "brief": re.sub(r"\*\*|`", "", brief).strip(),
                "skills": skills.get(relative, ""),
                "prerequisite": prerequisite[1].strip().rstrip(".") if prerequisite else "",
                "scope": scope,
                "acceptance": acceptance,
                # A notebook "Project check" cell grades the independent ticket; others are reviewed work.
                "automaticCheck": any("Project check" in c for c in code),
                "source": f"{COURSE_REPO_URL}/blob/main/{relative}",
                "package": {
                    "path": package.relative_to(course).as_posix(),
                    "source": f"{COURSE_REPO_URL}/tree/main/{package.relative_to(course).as_posix()}",
                    "install": "python -m pip install -e .",
                    "test": "python -m unittest discover -s tests -v",
                } if package else None,
            })
    return projects


def python_concepts(course: Path) -> list[dict]:
    """The curriculum's concept graph (curriculum/concepts.json), keyed by lesson id."""
    path = course / "curriculum" / "concepts.json"
    if not path.exists():
        return []
    concepts = json.loads(path.read_text(encoding="utf-8"))
    by_concept = {c["concept_id"]: c["lesson"].removesuffix(".ipynb") for c in concepts}
    return [{
        "id": c["lesson"].removesuffix(".ipynb"),
        "concept": c["concept_id"],
        "skill": c["primary_skill"],
        "difficulty": c.get("difficulty", ""),
        "prerequisites": [by_concept[p] for p in c.get("prerequisites", []) if p in by_concept],
        "evidence": c.get("independent_evidence", ""),
    } for c in concepts]


def build(course: Path, out: Path) -> dict:
    if out.exists():
        shutil.rmtree(out)
    (out / "data" / "nb").mkdir(parents=True)
    revision = subprocess.check_output(["git", "-C", str(course), "rev-parse", "HEAD"], text=True).strip()
    print(f"Python curriculum {revision}")
    catalog = {"revision": revision, "course": COURSE_REPO_URL, "levels": []}
    catalog["workbooks"] = workbook_modules(course)
    assessed_challenges = {
        (lesson, "wb:" + name)
        for pack in catalog["workbooks"].values()
        for name in pack["exercises"]
        for lesson in [pack.get("lessons", {}).get(name)]
        if lesson
    }
    for level, label, medal in LEVELS:
        entry = {"id": level, "title": label, "medal": medal, "sections": [], "total": 0}
        for folder, section_title in SECTIONS:
            items = []
            for path in sorted((course / level / folder).glob("*.ipynb")):
                nb = convert_notebook(path, course)
                nb["revision"] = revision
                keys = lesson_totals(nb)
                if "/notebooks/" in nb["id"]:
                    keys = [key for key in keys if not key.startswith("wb:") or (nb["id"], key) in assessed_challenges]
                nb["graded"] = keys
                out_file = out / "data" / "nb" / (nb["id"].replace("/", "__") + ".json")
                out_file.write_text(json.dumps(nb, ensure_ascii=False), encoding="utf-8")
                items.append({"id": nb["id"], "title": nb["title"], "graded": len(keys)})
                entry["total"] += len(keys)
            if items:
                entry["sections"].append({"id": folder, "title": section_title, "items": items})
        catalog["levels"].append(entry)
    (out / "data" / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "data" / "concepts.json").write_text(json.dumps(python_concepts(course), ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "data" / "studio.json").write_text(json.dumps(studio_projects(course), ensure_ascii=False, indent=1), encoding="utf-8")

    listed = []
    for source in course_files(course):
        relative = source.relative_to(course).as_posix()
        target = out / "course" / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        listed.append(relative)
    (out / "course" / "pytest.ini").write_text(WEB_PYTEST_INI, encoding="utf-8")
    listed.append("pytest.ini")
    (out / "data" / "course-files.json").write_text(json.dumps(sorted(listed), indent=1), encoding="utf-8")
    return catalog


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--course", required=True, help="path to a python-notebook checkout")
    parser.add_argument("--out", default="dist")
    args = parser.parse_args(argv)
    catalog = build(Path(args.course).resolve(), Path(args.out).resolve())
    notebooks = sum(len(s["items"]) for level in catalog["levels"] for s in level["sections"])
    graded = sum(level["total"] for level in catalog["levels"])
    print(f"built {notebooks} notebooks, {graded} graded items -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
