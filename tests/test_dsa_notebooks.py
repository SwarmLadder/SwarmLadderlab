"""The DSA lessons as Lab notebooks: real drills, honest grading, real quizzes."""
import contextlib
import importlib.util
import io
import json
import os
import re
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "build"))
from build_dsa_c import build_dsa  # noqa: E402
from dsa_notebooks import quiz_fingerprint  # noqa: E402

COURSE = Path(os.environ.get("DSA_COURSE", HERE.parent / "Data-Structures-Algorithms"))
pytestmark = pytest.mark.skipif(not (COURSE / "drills").is_dir(), reason="DSA course checkout not available")
LEVELS = ("basics", "intermediate", "advanced")


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    out = tmp_path_factory.mktemp("dsa")
    catalog = build_dsa(COURSE, out)
    return catalog, out


def pages(out):
    return [json.loads(p.read_text()) for p in sorted((out / "data/dsa/nb").glob("dsa__*__lessons__*.json"))]


def grader(out, level):
    """Import the browser grader for one level, as Pyodide does from the lesson folder."""
    spec = importlib.util.spec_from_file_location(f"dsa_lesson_{level}", out / "course/dsa" / level / "lessons/lesson.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_check(module, lesson_id, did, code):
    namespace = {"__name__": "__main__"}
    exec("from builtins import *", namespace)
    namespace["___"] = module.___
    namespace["check"] = module.Exercises(lesson_id)
    try:
        exec(code, namespace)
    except SyntaxError:
        # The Lab worker reports an unparsable cell that still holds ___ as not attempted.
        assert "___" in code
        return None, "Not attempted"
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        exec(f"check('{did}')", namespace)
    return namespace["check"].last_result, buffer.getvalue()


def test_every_lesson_is_an_interactive_notebook(built):
    catalog, out = built
    all_pages = pages(out)
    assert len(all_pages) == 36
    drills = [k for p in all_pages for k in p["graded"] if k.startswith("wb:")]
    quizzes = [k for p in all_pages for k in p["graded"] if re.fullmatch(r"q\d+", k)]
    assert len(drills) == len(set(drills)) == 144
    assert len(quizzes) == 144
    for page in all_pages:
        kinds = [c.get("kind") for c in page["cells"] if c["type"] == "code"]
        assert kinds.count("setup") == 1 and kinds.count("quiz") == 1 and kinds.count("check") == 4, page["id"]
        assert "code" in kinds, page["id"]  # runnable examples
        assert not any("<!-- output -->" in c.get("html", "") for c in page["cells"])
        lesson_items = {i["id"]: i for l in catalog["levels"] for s in l["sections"] for i in s["items"]}
        assert lesson_items[page["id"]]["graded"] == len(page["graded"]) == 8


def test_lesson_links_stay_in_the_lab(built):
    _, out = built
    text = json.dumps(pages(out))
    assert "/lesson/dsa/basics/problems/B04" in text
    assert "/lesson/dsa/basics/lessons/02_two_pointers_and_invariants" in text
    assert "tools.drills" not in text and "tools.quiz" not in text and "tools.practice show" not in text


def test_references_pass_starters_are_unattempted_and_wrong_code_fails(built):
    _, out = built
    seen = 0
    for page in pages(out):
        level = page["id"].split("/")[1]
        module = grader(out, level)
        for key in page["graded"]:
            if not key.startswith("wb:"):
                continue
            did = key[3:]
            seen += 1
            reference = (COURSE / "drills/reference" / f"{did}.py").read_text()
            ok, text = run_check(module, page["id"], did, reference)
            assert ok is True, (did, text)
            assert f"✅ {did}: all 6 checks passed" in text
            starter = next(c for c in page["cells"] if c.get("id") == f"drill-{did}")["source"]
            ok, text = run_check(module, page["id"], did, starter)
            assert ok is None, (did, text)
            assert "Not attempted" in text
            wrong = re.sub(r"(?m)^def solve\((.*)\):", r"def solve(\1):\n    return '__wrong__'\n\ndef _unused(\1):", reference, count=1)
            ok, text = run_check(module, page["id"], did, wrong)
            assert ok is False, (did, text)
            assert "hint 1/" in text and "expected" in text
    assert seen == 144


def test_quiz_hashes_have_exactly_one_correct_option(built):
    _, out = built
    for page in pages(out):
        quiz = next(c for c in page["cells"] if c.get("kind") == "quiz")["source"]
        key = re.search(r"Quiz\('([^']+)'", quiz).group(1)
        hashes = dict((int(n), h) for n, h in re.findall(r"(\d+): '([0-9a-f]{12})'", quiz))
        md = next(c["html"] for c in reversed(page["cells"][:page["cells"].index(next(c for c in page["cells"] if c.get("kind") == "quiz"))]) if c["type"] == "md")
        for n, digest in hashes.items():
            matches = [letter for letter in "abcd" if quiz_fingerprint(key, n, letter) == digest]
            assert len(matches) == 1, (page["id"], n)
            assert f"<strong>{n}.</strong>" in md
        assert set(page["quizFeedback"]) == {str(n) for n in hashes}


def test_grader_matches_the_lab_worker_interface(built):
    # py-worker.js observes Exercises.__call__ and Exercises.assess by code object.
    _, out = built
    module = grader(out, "basics")
    assert callable(module.Exercises.__call__) and callable(module.Exercises.assess)
    assert "number" in module.Exercises.__call__.__code__.co_varnames


def test_worked_examples_run_top_to_bottom(built):
    # Every code cell of every worked example runs, in order, in one namespace (as "Run all" does).
    _, out = built
    examples = sorted((out / "data/dsa/nb").glob("dsa__*__worked__*.json"))
    assert len(examples) == 18
    for path in examples:
        page = json.loads(path.read_text())
        assert page["graded"] == [] and page["sourcePath"].startswith("worked_examples/")
        namespace = {"__name__": "__main__"}
        with contextlib.redirect_stdout(io.StringIO()):
            for c in page["cells"]:
                if c["type"] == "code":
                    exec(c["source"], namespace)
        assert "<!-- output -->" not in json.dumps(page)


def run_project(out, level, slug, code):
    module = grader(out, level)
    spec = importlib.util.spec_from_file_location(f"dsa_build_{level}", out / "course/dsa" / level / "builds/lesson.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    namespace = {"__name__": "__main__", "check": module.Exercises(f"dsa/{level}/builds/{slug}")}
    exec(code, namespace)
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        exec("check('project')", namespace)
    return namespace["check"].last_result, buffer.getvalue()


def test_projects_run_the_course_test_suites(built):
    catalog, out = built
    builds = sorted((out / "data/dsa/nb").glob("dsa__*__builds__*.json"))
    assert len(builds) == 6
    for path in builds:
        page = json.loads(path.read_text())
        level, slug = page["id"].split("/")[1], page["id"].split("/")[3]
        folder = COURSE / "projects" / level / slug
        assert page["graded"] == ["wb:project"]
        work = next(c for c in page["cells"] if c.get("id") == "build-work")
        assert work["source"].strip() == (folder / "starter.py").read_text().strip()
        ok, text = run_project(out, level, slug, (folder / "reference.py").read_text())
        assert ok is True, (slug, text)
        assert "✅ project: all" in text and "random" in text.lower()
        ok, text = run_project(out, level, slug, work["source"])
        assert ok is None and "Not attempted" in text, (slug, text)
        # Break one function of the reference: the suite must catch it.
        reference = (folder / "reference.py").read_text()
        kind, name = re.search(r"(?m)^(def|class) (\w+)", reference).groups()
        dummy = ("def {0}(*args, **kwargs):\n    return None\n" if kind == "def"
                 else "class {0}:\n    def __init__(self, *args, **kwargs):\n        pass\n").format(name)
        broken = reference + "\n\n" + dummy
        ok, text = run_project(out, level, slug, broken)
        assert ok is False and "❌" in text, (slug, text)


def test_dsa_sections_are_unique_and_ordered_for_learning(built):
    catalog, _ = built
    for level in catalog["levels"]:
        ids = [s["id"] for s in level["sections"]]
        assert len(ids) == len(set(ids)), ids
        assert ids[:5] == ["notebooks", "exercises", "worked_examples", "projects", "interview"]


def test_visualizations_trace_real_lesson_code_for_every_structure(built):
    _, out = built
    visuals = [(page, c) for page in pages(out) for c in page["cells"] if c.get("kind") == "visual"]
    assert len(visuals) == 15
    kinds = {view["kind"] for _, c in visuals for view in c["views"]}
    assert kinds >= {"array", "map", "stack", "queue", "linked", "tree", "heap", "graph", "table", "dsu", "vars"}
    for page, c in visuals:
        # The traced function is the lesson's own code, verbatim.
        lesson = (COURSE / page["sourcePath"]).read_text()
        body = c["source"].split("\n\n", 1)[1]
        for chunk in body.split("\n\n\n"):
            assert chunk.strip() in lesson, (page["id"], chunk[:60])
        assert c["steps"] >= 5 and c["watch"] and c["driver"]
