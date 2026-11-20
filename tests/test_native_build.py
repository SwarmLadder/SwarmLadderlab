"""Integration tests against complete upstream Git/GitHub and Rust curricula."""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from build.build_git_rust import build_git, build_rust, functions


@pytest.fixture(scope="module")
def generated(tmp_path_factory):
    git = Path(os.environ.get("GIT_COURSE", "../git-github-course")).resolve()
    rust = Path(os.environ.get("RUST_COURSE", "../RUST")).resolve()
    if not git.is_dir() or not rust.is_dir():
        pytest.skip("Clone Git/Rust curricula or set GIT_COURSE and RUST_COURSE")
    output = tmp_path_factory.mktemp("native-curricula")
    return build_git(git, output), build_rust(rust, output), output


def records(catalog):
    return [entry for level in catalog["levels"] for section in level["sections"]
            for entry in section["items"]]


def page(output, course, item):
    path = output / "data" / course / "nb" / (item["id"].replace("/", "__") + ".json")
    assert path.is_file(), item["id"]
    return json.loads(path.read_text(encoding="utf-8"))


def test_entire_git_course_and_real_checker_contract(generated):
    catalog, _, out = generated
    assert len(catalog["levels"]) == 3
    items = records(catalog)
    assert len(items) == 114  # 36 lessons + 24 labs + 45 Q&A + 6 workshops + 3 projects
    assert len({entry["id"] for entry in items}) == 114
    assert [level["total"] for level in catalog["levels"]] == [8, 8, 8]
    for level in catalog["levels"]:
        sections = level["sections"]
        assert [len(s["items"]) for s in sections] == [12, 8, 15, 2, 1]
        for entry in records({"levels": [level]}):
            obj = page(out, "git", entry)
            assert obj["mode"] == "local-git"
            assert obj["id"] == entry["id"]
            assert obj["sourcePath"]
            assert "guideHtml" in obj
            assert obj["graded"] == (["self-reported"] if entry["graded"] else [])
    task = page(out, "git", next(i for i in items if i["id"] == "git/basics/labs/B01"))
    assert task["checkCommand"] == "python tools/practice.py check B01"
    assert task["practiceCommand"] == "python tools/practice.py start B01"
    assert "not a server-verified result" in task["guideHtml"]
    sample = page(out, "git", next(i for i in items if "/interview/" in i["id"]))
    assert "Reveal explained answer" in sample["guideHtml"]


def test_complete_rust_course_with_all_functions(generated):
    _, catalog, out = generated
    assert len(catalog["levels"]) == 3
    items = records(catalog)
    assert len(items) == 227  # 39 guides + 168 coding + 8 study-log + 12 projects/portfolios
    assert len({entry["id"] for entry in items}) == 227
    assert [level["total"] for level in catalog["levels"]] == [60, 60, 56]
    for level in catalog["levels"]:
        sizes = [len(s["items"]) for s in level["sections"]]
        assert sizes == [13, 56, 4 if level["id"] != "advanced" else 0, 4]
    for entry in items:
        obj = page(out, "rust", entry)
        assert obj["mode"] == "local-rust"
        assert obj["sourcePath"]
        assert "guideHtml" in obj
        assert obj["graded"] == (["self-reported"] if entry["graded"] else [])
        assert not obj["sourcePath"].endswith("reference.rs")
        assert "/solutions/" not in obj["sourcePath"]
        if entry["graded"]:
            assert obj["checkCommand"].startswith("cargo test")
            assert "pub fn" in obj["source"] or "/study-log/" in entry["id"]
    mastery = page(out, "rust", next(i for i in items if i["id"] == "rust/advanced/mastery/A04"))
    assert "Atomic" in mastery["title"] or "Capacity" in mastery["title"]
    assert "todo!" in mastery["source"]
    assert mastery["checkCommand"] == "cargo test --test mastery a04_"


def test_manifest_and_cross_course_page_ids_are_distinct(generated):
    git, rust, output = generated
    git_ids = {i["id"] for i in records(git)}
    rust_ids = {i["id"] for i in records(rust)}
    assert not git_ids.intersection(rust_ids)
    for name in ("git", "rust"):
        data = json.loads((output / "data" / name / "catalog.json").read_text("utf-8"))
        assert data["workbooks"] == {}
        assert len(data["levels"]) == 3


def test_starter_extractor_does_not_ship_answer_key():
    sample = "pub fn outer(x: i32) -> i32 {\n if x > 0 { todo!() } else { todo!() }\n}\n"
    assert functions(sample) == [("outer", sample.strip())]
    with pytest.raises(ValueError):
        functions("pub fn broken() {")
