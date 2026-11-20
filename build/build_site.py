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
    if cell_id == "quiz-check":
        return "quiz"
    if cell_id.startswith("try-"):
        return "setup" if "Exercises(" in text else "exercise"
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
            cells.append({"type": "code", "id": cell.get("id") or f"cell-{index}", "kind": kind, "source": text})
    return {"id": nb_id, "title": title or path.stem, "folder": posixpath.dirname(nb_id), "cells": cells}


def lesson_totals(nb: dict) -> dict:
    """Counts of graded items in a notebook, keyed like the progress the site stores."""
    keys = []
    for cell in nb["cells"]:
        if cell["type"] != "code":
            continue
        if cell["kind"] == "setup" and "Exercises(" in cell["source"]:
            match = re.search(r"Exercises\('[^']+', (\{.*\})\)", cell["source"])
            keys += [f"ex{n}" for n in sorted(ast.literal_eval(match.group(1)))]
        elif cell["kind"] == "quiz":
            match = re.search(r"Quiz\('[^']+', (\{.*?\})\)", cell["source"])
            keys += [f"q{n}" for n in sorted(ast.literal_eval(match.group(1)))]
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
    return result


def build(course: Path, out: Path) -> dict:
    if out.exists():
        shutil.rmtree(out)
    (out / "data" / "nb").mkdir(parents=True)
    catalog = {"course": COURSE_REPO_URL, "levels": []}
    for level, label, medal in LEVELS:
        entry = {"id": level, "title": label, "medal": medal, "sections": [], "total": 0}
        for folder, section_title in SECTIONS:
            items = []
            for path in sorted((course / level / folder).glob("*.ipynb")):
                nb = convert_notebook(path, course)
                keys = lesson_totals(nb)
                nb["graded"] = keys
                out_file = out / "data" / "nb" / (nb["id"].replace("/", "__") + ".json")
                out_file.write_text(json.dumps(nb, ensure_ascii=False), encoding="utf-8")
                items.append({"id": nb["id"], "title": nb["title"], "graded": len(keys)})
                entry["total"] += len(keys)
            if items:
                entry["sections"].append({"id": folder, "title": section_title, "items": items})
        catalog["levels"].append(entry)
    catalog["workbooks"] = workbook_modules(course)
    (out / "data" / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")

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
