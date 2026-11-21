"""Ensure full upstream C17 and DSA curricula import without fake grading."""
from __future__ import annotations
import json
import os
from pathlib import Path
import pytest

from build.build_dsa_c import build_dsa, build_c

@pytest.fixture(scope="module")
def generated(tmp_path_factory):
    dsa = Path(os.environ.get("DSA_COURSE", "../Data-Structures-Algorithms"))
    c = Path(os.environ.get("C_COURSE", "../C"))
    if not dsa.exists() or not c.exists():
        pytest.skip("Clone SwarmLadder/Data-Structures-Algorithms and SwarmLadder/C first")
    output = tmp_path_factory.mktemp("dsa-and-c")
    return build_dsa(dsa, output), build_c(c, output), output

def items(catalog):
    return [item for level in catalog["levels"]
            for section in level["sections"] for item in section["items"]]

def page(out, id):
    path = out / "data" / id.split("/")[0] / "nb" / (id.replace("/", "__") + ".json")
    assert path.is_file(), id
    return json.loads(path.read_text("utf-8"))

def test_complete_dsa_problem_bank_and_non_fake_grading(generated):
    dsa, _, out = generated
    assert len(dsa["levels"]) == 3
    tasks = items(dsa)
    assert len(tasks) == 94
    assert len({entry["id"] for entry in tasks}) == 94
    assert [level["total"] for level in dsa["levels"]] == [16, 16, 16]
    for level in dsa["levels"]:
        section_sizes = [len(s["items"]) for s in level["sections"]]
        assert section_sizes == ([12, 16, 1, 1, 4] if level["id"] == "advanced"
                                 else [12, 16, 1, 1])
    assert sum(entry["graded"] for entry in tasks) == 48
    for entry in tasks:
        activity = page(out, entry["id"])
        assert activity["id"] == entry["id"]
        assert activity["guideHtml"]
        assert activity["sourcePath"]
        if entry["graded"]:
            assert activity["mode"] == "browser-dsa"
            assert activity["graded"] == ["case-suite"]
            assert len(activity["cases"]) == 6
            assert "NotImplementedError" in activity["source"]
            assert "Deep solution study" in activity["guideHtml"]
            assert "sourcePath" not in activity["cases"][0]
            assert len(activity["hints"]) >= 2
        else:
            assert activity["mode"] == "reading-dsa"
            assert activity["graded"] == []
    first = page(out, "dsa/basics/problems/B01")
    assert first["prompt"].startswith("Return the indices")
    assert first["signature"] == "def solve(nums, target):"
    assert first["cases"][0]["expected"] == [0, 1]
    assert first["sourcePath"] == "problems/B01.md"

def test_c_complete_course_and_truthful_native_lab_checks(generated):
    _, c, out = generated
    assert len(c["levels"]) == 3
    tasks = items(c)
    assert len(tasks) == 182
    assert len({entry["id"] for entry in tasks}) == 182
    assert [level["total"] for level in c["levels"]] == [31, 31, 31]
    assert [len(s["items"]) for s in c["levels"][0]["sections"]] == [27, 6, 6, 4, 4, 12]
    assert len(c["levels"][2]["sections"][-1]["items"]) == 5
    assert sum(item["graded"] for item in tasks) == 93
    for item in tasks:
        activity = page(out, item["id"])
        assert activity["mode"] == "local-c"
        assert activity["id"] == item["id"]
        assert activity["sourcePath"]
        if item["graded"]:
            assert activity["graded"] == ["self-reported"]
            assert "reference/" not in activity["sourcePath"]
            if "/drills/" in item["id"]:
                assert activity["checkCommand"].startswith("make check TASK=")
                assert activity["practiceFile"].startswith(item["id"].split("/")[1] + "/starter/")
                assert "Implement " in activity["source"]
                assert "CHECK(" in activity["challenge"]["testSnippet"]
                assert activity["challenge"]["function"] in activity["checkCommand"]
                assert activity["challenge"]["prompt"]
                assert "practiceFile" in activity["challenge"]
            else:
                assert "TODO" in activity["source"]
                assert activity["checkCommand"].startswith("make mastery-check TASK=")
                assert "does not compile or grade C" in activity["guideHtml"]
        else:
            assert activity["graded"] == []
    for level, commands in (
        ("basics", {"checked_add", "parse_decimal", "reverse_span", "parse_hex"}),
        ("intermediate", {"text_buffer", "byte_histogram", "lower_bound", "unique_sorted"}),
        ("advanced", {"frame_header", "topological", "ring_queue", "dag_distances"}),
    ):
        labs = c["levels"][{"basics": 0, "intermediate": 1, "advanced": 2}[level]]["sections"][3]["items"]
        actual = {page(out, task["id"])["checkCommand"].split("TASK=")[-1] for task in labs}
        assert actual == commands
    interview = page(out, "c/basics/interview/01")
    assert "Reveal explained answer" in interview["guideHtml"]



def test_workshop_drills_are_real_native_tests_with_shared_starters(generated):
    _, c, out = generated
    for level in c["levels"]:
        drills = level["sections"][0]["items"]
        assert len(drills) == 27
        assert all("/drills/" in item["id"] for item in drills)
        assert all(item["graded"] == 1 for item in drills)
        files = [page(out, item["id"])["practiceFile"] for item in drills]
        assert len(set(files)) == 9  # six workshops + three projects per level
        assert any(files.count(file) == 4 for file in files)
        for item in drills:
            doc = page(out, item["id"])
            assert doc["checkCommand"] == "make check TASK=" + doc["challenge"]["function"]
            assert doc["sourcePath"].endswith(".md")
            assert doc["source"].startswith('#include "course.h"')

def test_cross_course_progress_id_isolation_and_catalog_export(generated):
    dsa, c, out = generated
    assert not {i["id"] for i in items(dsa)} & {i["id"] for i in items(c)}
    for name, catalog in (("dsa", dsa), ("c", c)):
        saved = json.loads((out / "data" / name / "catalog.json").read_text("utf-8"))
        assert saved == catalog
        assert saved["workbooks"] == {}

def test_reject_missing_upstream_content(tmp_path):
    with pytest.raises(FileNotFoundError):
        build_dsa(tmp_path, tmp_path / "dsa")
    with pytest.raises(FileNotFoundError):
        build_c(tmp_path, tmp_path / "c")
