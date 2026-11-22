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
# Intermediate and Advanced followed later; an older course checkout still has their workbooks.
UPPER_LESSON_CHALLENGES = COURSE.exists() and not any((COURSE / "intermediate" / "exercises").glob("*.ipynb"))


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
    if UPPER_LESSON_CHALLENGES:
        upper = "intermediate__notebooks__02_classes_and_objects"
    else:
        upper = "intermediate__exercises__01_oop_and_collections_exercises"
    assert any(k.startswith("wb:") for k in json.loads((dist / "data" / "nb" / f"{upper}.json").read_text())["graded"])


@pytest.mark.skipif(not LESSON_CHALLENGES, reason="this course checkout still keeps Basics challenges in workbooks")
def test_lesson_challenges_form_achievement_packs(dist):
    workbooks = json.loads((dist / "data" / "catalog.json").read_text())["workbooks"]
    pack = workbooks["pack:basics_02_control_flow"]
    assert pack["level"] == "basics" and pack["title"] == "Control flow"
    assert pack["lessons"]["classify_temperature"] == "basics/notebooks/05_conditional_statements"
    assert "classify_temperature" in pack["exercises"]


@pytest.mark.skipif(not UPPER_LESSON_CHALLENGES, reason="this course checkout still keeps Intermediate/Advanced challenges in workbooks")
def test_every_level_has_lesson_packs(dist):
    workbooks = json.loads((dist / "data" / "catalog.json").read_text())["workbooks"]
    for level in ("basics", "intermediate", "advanced"):
        packs = [w for k, w in workbooks.items() if k.startswith("pack:") and w["level"] == level]
        assert len(packs) == 4, level
        assert all(w["exercises"] and set(w["lessons"]) >= set(w["exercises"]) for w in packs), level
    pack = workbooks["pack:advanced_02_concurrency_resilience"]
    assert pack["lessons"]["gather_in_order"] == "advanced/notebooks/05_asyncio_event_loop"
    assert not any(k.startswith(("intermediate/exercises", "advanced/exercises")) for k in workbooks)


def test_colab_setup_cell_is_dropped_and_links_rewritten(dist):
    lesson = json.loads((dist / "data" / "nb" / "basics__notebooks__06_loops.json").read_text())
    assert not any(c.get("kind") == "colab" or "git clone" in c.get("source", "") for c in lesson["cells"])
    html = " ".join(c["html"] for c in lesson["cells"] if c["type"] == "md")
    assert "/lesson/basics/notebooks/07_lists" in html, "Next link should point to the site"
    assert ".ipynb" not in html.replace("github.com", "")


def test_course_files_for_python_are_present(dist):
    files = json.loads((dist / "data" / "course-files.json").read_text())
    needed_files = ["basics/notebooks/lesson.py", "basics/notebooks/quiz.py", "practice/grader.py", "practice/notebook_check.py", "practice/conftest.py", "conftest.py", "pytest.ini"]
    if not UPPER_LESSON_CHALLENGES:
        needed_files.append("intermediate/exercises/check.py")
    for needed in needed_files:
        assert needed in files and (dist / "course" / needed).exists(), needed
    assert not any("solution" in f.lower() for f in files), "never ship solutions"
    assert "faulthandler_timeout" not in (dist / "course" / "pytest.ini").read_text()



def test_export_preserves_dependencies_and_current_helper(dist):
    revision = subprocess.check_output(["git", "-C", str(COURSE), "rev-parse", "HEAD"], text=True).strip()
    assert json.loads((dist / "data/catalog.json").read_text())["revision"] == revision
    for path in COURSE.glob("*/*/*.ipynb"):
        nb_id = path.relative_to(COURSE).with_suffix("").as_posix().replace("/", "__")
        generated = json.loads((dist / f"data/nb/{nb_id}.json").read_text())
        exported = {c["id"]: c for c in generated["cells"] if c["type"] == "code"}
        assert generated["revision"] == revision
        for c in json.loads(path.read_text())["cells"]:
            if c["cell_type"] == "code" and c["id"] != "colab-setup":
                assert exported[c["id"]]["requires_cells"] == c["metadata"].get("requires_cells", [])
                assert exported[c["id"]]["source"] == "".join(c["source"])
    for helper in ["practice/notebook_check.py","practice/practice_loader.py","advanced/notebooks/lesson.py"]:
        assert (dist / "course" / helper).read_bytes() == (COURSE / helper).read_bytes()

def test_jointly_graded_helper_does_not_block_completion(dist):
    lesson = json.loads((dist / "data/nb/intermediate__notebooks__15_sqlite_and_transactions.json").read_text())
    assert "wb:create_schema" not in lesson["graded"]
    assert "wb:add_task" in lesson["graded"]
