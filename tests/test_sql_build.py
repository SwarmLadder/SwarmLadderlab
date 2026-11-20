"""Integration contract between the SQL repository and the Lab importer."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import sqlite3

import pytest

from build.build_sql import build_sql, digest


@pytest.fixture(scope="module")
def generated(tmp_path_factory):
    source = Path(os.environ.get("SQL_COURSE", "../SQL")).resolve()
    if not source.is_dir():
        pytest.skip("Clone SwarmLadder/SQL or set SQL_COURSE to test its course importer")
    out = tmp_path_factory.mktemp("sql-course")
    return build_sql(source, out), out, source


def test_complete_course_structure(generated):
    catalog, out, _ = generated
    assert len(catalog["levels"]) == 3
    assert sum(len(s["items"]) for l in catalog["levels"] for s in l["sections"]) == 105
    assert [l["total"] for l in catalog["levels"]] == [16, 16, 20]
    for level in catalog["levels"]:
        assert len(next(s for s in level["sections"] if s["id"] == "notebooks")["items"]) == 10
        assert len(next(s for s in level["sections"] if s["id"] == "exercises")["items"]) == 16
        assert len(next(s for s in level["sections"] if s["id"] == "projects")["items"]) == 2
    advanced = catalog["levels"][2]
    assert len([i for s in advanced["sections"] for i in s["items"] if "/schema/" in i["id"]]) == 4
    assert len(next(s for s in advanced["sections"] if s["id"] == "worked_examples")["items"]) == 17
    assert (out / "data/sql/catalog.json").exists()


def test_challenge_digests_and_no_solutions(generated):
    _, out, source = generated
    sample = json.loads((out / "data/sql/nb/sql__basics__interview__B10.json").read_text())
    assert sample["graded"] == ["challenge"]
    assert sample["grade"]["base"] and sample["grade"]["edge"]
    assert sample["sourcePath"] == "interview/starter/B10.sql"
    assert "SELECT" not in sample["source"].split("-- Add one")[0]  # starter comments, not solution
    assert not list((out / "course").rglob("*reference*"))
    import sys
    sys.path.insert(0, str(source / "tools"))
    from interview_practice import execute
    ref = (source / "interview/reference/B10.sql").read_text()
    assert sample["grade"]["base"] == digest(execute(ref))
    assert sample["grade"]["edge"] == digest(execute(ref, edge=True))


def test_fixtures_are_disposable_sqlite_datasets(generated):
    _, out, _ = generated
    for name, count in (("base", 8), ("edge", 9)):
        dump = (out / f"course/sql/fixtures/{name}.sql").read_text()
        with sqlite3.connect(":memory:") as db:
            db.executescript(dump)
            assert db.execute("SELECT COUNT(*) FROM customers").fetchone()[0] == count


def test_postgresql_labs_are_not_runnable_in_sqlite(generated):
    _, out, _ = generated
    pg = json.loads((out / "data/sql/nb/sql__advanced__postgresql__01_jsonb.json").read_text())
    assert pg["dialect"] == "postgresql"
    assert pg["runnable"] is False
    assert "PostgreSQL" in pg["guideHtml"]
    assert pg["grade"] is None


def test_schema_challenge_uses_behavioral_checker(generated):
    _, out, _ = generated
    page = json.loads((out / "data/sql/nb/sql__advanced__schema__C01.json").read_text())
    assert page["schemaTask"] == "C01"
    assert page["grade"] is None
    assert page["graded"] == ["challenge"]
    assert (out / "course/sql/tools/schema_practice.py").exists()
    assert (out / "course/sql/data/schema.sql").exists()
