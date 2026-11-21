"""Java course data import is stable and does not fake browser grading."""
from pathlib import Path
import json

from build.build_java import build_java


def test_java_catalog_and_local_verification(tmp_path):
    source = tmp_path / "Java"
    (source / "src/starter").mkdir(parents=True)
    (source / "tests").mkdir()
    (source / "README.md").write_text("Java practical course", encoding="utf-8")
    (source / "src/starter/Tasks.java").write_text(
        "public class Tasks { " + " ".join(
            "static void " + name + "() {}" for name in
            ("twoSum", "moveZeros", "lowerBound", "validBrackets",
             "maxSubarray", "mergeSorted", "shortestPath", "firstUnique")
        ) + " }", encoding="utf-8")
    (source / "tests/LabCheck.java").write_text(
        "class LabCheck { " + " ".join('"' + name + '"' for name in
            ("two-sum", "move-zeros", "lower-bound", "valid-brackets",
             "max-subarray", "merge-sorted", "shortest-path", "first-unique"))
        + " }", encoding="utf-8")

    out = tmp_path / "site"
    catalog = build_java(source, out)
    assert len(catalog["levels"]) == 1
    assert catalog["levels"][0]["total"] == 8
    activities = catalog["levels"][0]["sections"][0]["items"]
    assert len(activities) == 8
    assert all(item["graded"] == 1 for item in activities)
    for item in activities:
        path = out / "data/java/nb" / (item["id"].replace("/", "__") + ".json")
        page = json.loads(path.read_text(encoding="utf-8"))
        assert page["id"] == item["id"]
        assert page["mode"] == "local-java"
        assert page["graded"] == ["self-reported"]
        assert page["checkCommand"].startswith("make check TASK=")
        assert page["practiceFile"] == "src/starter/Tasks.java"
        assert page["source"].startswith("public class Tasks")
        assert page["challenge"]["prompt"]
        assert page["exampleInput"]
        assert page["exampleOutput"]
        assert page["shortExplanation"]
        assert page["complexity"]
