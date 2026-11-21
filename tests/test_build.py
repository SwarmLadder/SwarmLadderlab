"""Checks on the built site (run after build/build_site.py, or let the fixture build it)."""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
COURSE = Path(os.environ.get("COURSE", ROOT.parent / "python-notebook")).resolve()
# Teach-then-test Basics keeps its challenges in the lessons and has no workbooks.
LESSON_CHALLENGES = COURSE.exists() and not any((COURSE / "basics" / "exercises").glob("*.ipynb"))


@pytest.fixture(scope="session")
def dist(tmp_path_factory):
    if not COURSE.exists():
        pytest.skip(f"course checkout not found at {COURSE} (set COURSE=...)")
    out = tmp_path_factory.mktemp("dist")
    subprocess.run([sys.executable, str(ROOT / "build" / "build_site.py"), "--course", str(COURSE), "--out", str(out)], check=True)
    return out


def test_catalog_covers_every_notebook(dist):
    catalog = json.loads((dist / "data" / "catalog.json").read_text())
    ids = [i["id"] for level in catalog["levels"] for s in level["sections"] for i in s["items"]]
    on_disk = sorted(p.relative_to(COURSE).with_suffix("").as_posix() for p in COURSE.glob("*/*/*.ipynb"))
    assert sorted(ids) == on_disk
    assert all((dist / "data" / "nb" / (i.replace("/", "__") + ".json")).exists() for i in ids)


def test_graded_items_are_counted(dist):
    catalog = json.loads((dist / "data" / "catalog.json").read_text())
    assert all(level["total"] > 100 for level in catalog["levels"])
    lesson = json.loads((dist / "data" / "nb" / "basics__notebooks__01_variables_and_data_types.json").read_text())
    assert {"ex1", "ex2", "ex3", "ex4", "q1", "q2", "q3"} <= set(lesson["graded"])
    # Basics challenges live inside the lessons in the teach-then-test layout,
    # and in workbook notebooks in the older one; both must be counted.
    if LESSON_CHALLENGES:
        holder = "basics__notebooks__05_conditional_statements"
    else:
        holder = "basics__exercises__02_control_flow_exercises"
    assert "wb:classify_temperature" in json.loads((dist / "data" / "nb" / f"{holder}.json").read_text())["graded"]
    workbook = json.loads((dist / "data" / "nb" / "intermediate__exercises__01_oop_and_collections_exercises.json").read_text())
    assert any(k.startswith("wb:") for k in workbook["graded"])


@pytest.mark.skipif(not LESSON_CHALLENGES, reason="this course checkout still keeps Basics challenges in workbooks")
def test_lesson_challenges_form_achievement_packs(dist):
    workbooks = json.loads((dist / "data" / "catalog.json").read_text())["workbooks"]
    pack = workbooks["pack:basics_02_control_flow"]
    assert pack["level"] == "basics" and pack["title"] == "Control flow"
    assert pack["lessons"]["classify_temperature"] == "basics/notebooks/05_conditional_statements"
    assert "classify_temperature" in pack["exercises"]


def test_colab_setup_cell_is_dropped_and_links_rewritten(dist):
    lesson = json.loads((dist / "data" / "nb" / "basics__notebooks__06_loops.json").read_text())
    assert not any(c.get("kind") == "colab" or "git clone" in c.get("source", "") for c in lesson["cells"])
    html = " ".join(c["html"] for c in lesson["cells"] if c["type"] == "md")
    assert "/lesson/basics/notebooks/07_lists" in html, "Next link should point to the site"
    assert ".ipynb" not in html.replace("github.com", "")


def test_course_files_for_python_are_present(dist):
    files = json.loads((dist / "data" / "course-files.json").read_text())
    for needed in ("basics/notebooks/lesson.py", "basics/notebooks/quiz.py", "intermediate/exercises/check.py",
                   "practice/grader.py", "practice/notebook_check.py", "practice/conftest.py", "conftest.py", "pytest.ini"):
        assert needed in files and (dist / "course" / needed).exists(), needed
    assert not any("solution" in f.lower() for f in files), "never ship solutions"
    assert "faulthandler_timeout" not in (dist / "course" / "pytest.ini").read_text()


