"""Build and check the complete upstream Linux course without native command execution."""
from __future__ import annotations
import json
import os
from pathlib import Path
import pytest
from build.build_linux import build_linux, questions

@pytest.fixture(scope="module")
def generated(tmp_path_factory):
    upstream = Path(os.environ.get("LINUX_COURSE", "../linux-course")).resolve()
    if not upstream.is_dir():
        pytest.skip("Check out SwarmLadder/linux-course or set LINUX_COURSE")
    destination = tmp_path_factory.mktemp("linux-curriculum")
    return build_linux(upstream, destination), destination

def all_items(catalog):
    return [item for level in catalog["levels"] for section in level["sections"] for item in section["items"]]

def test_all_guides_labs_exercises_and_interviews(generated):
    catalog, out = generated
    assert len(catalog["levels"]) == 3
    assert [level["total"] for level in catalog["levels"]] == [29, 29, 29]
    for level in catalog["levels"]:
        assert [len(section["items"]) for section in level["sections"]] == [12, 4, 25, 20, 1]
    items = all_items(catalog)
    assert len(items) == 186
    assert len({item["id"] for item in items}) == 186
    assert sum(item["graded"] for item in items) == 87
    for item in items:
        assert item["id"].startswith("linux/")
        path = out / "data/linux/nb" / (item["id"].replace("/", "__") + ".json")
        assert path.exists(), item["id"]
        entry = json.loads(path.read_text("utf-8"))
        assert entry["mode"] == "local-linux"
        assert entry["id"] == item["id"]
        assert entry["guideHtml"]
        assert entry["sourcePath"]
        assert entry["graded"] == (["self-reported"] if item["graded"] else [])
    saved = json.loads((out / "data/linux/catalog.json").read_text("utf-8"))
    assert saved == catalog
    assert catalog["workbooks"] == {}

def test_first_guided_lesson_and_real_local_checker(generated):
    catalog, out = generated
    first = json.loads((out / "data/linux/nb/linux__basics__lessons__00_shell_and_linux.json").read_text("utf-8"))
    assert "kernel" in first["guideHtml"].lower()
    assert "uname -srm" in first["source"]
    lab = json.loads((out / "data/linux/nb/linux__basics__labs__B01.json").read_text("utf-8"))
    assert lab["checkCommand"] == "python tools/grade.py B01"
    assert "exit 1" in lab["source"]  # unfinished starter, never the reference answer
    assert "cannot execute or grade" not in lab["guideHtml"] or "browser simulator" in lab["guideHtml"]
    assert "PASS" in lab["guideHtml"]
    practice = json.loads((out / "data/linux/nb/linux__basics__practice__01.json").read_text("utf-8"))
    assert practice["graded"] == ["self-reported"]
    assert not practice["checkCommand"]
    interview = json.loads((out / "data/linux/nb/linux__basics__interview__01.json").read_text("utf-8"))
    assert "Reveal explanation" in interview["guideHtml"]

def test_question_numbering_rejects_missing_numbers(tmp_path):
    path = tmp_path / "questions.md"
    path.write_text("# Demo\n\n1. Alpha\n\n3. Gamma\n")
    with pytest.raises(ValueError):
        questions(path, 2)

