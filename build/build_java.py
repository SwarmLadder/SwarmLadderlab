"""Import the standalone Java 17 practice repository into the Lab.

Java tasks have native JDK checks. No browser JVM/compiler is implied.
"""
from __future__ import annotations

import json
from pathlib import Path

from build_dsa_c import output

JAVA_REPO = "https://github.com/SwarmLadder/Java"

TASKS = (
    ("two-sum", "Two sum — hash map", "Return the two original indices whose values add to target.", "Expected O(n) time and O(n) extra space."),
    ("move-zeros", "Move zeros — two pointers", "Move all zeros to the end in place while keeping other values in order.", "O(n) time, O(1) extra space."),
    ("lower-bound", "Lower bound — binary search", "Return the first index where sorted values are at least target, or array length.", "O(log n) time, O(1) extra space."),
    ("valid-brackets", "Balanced brackets — stack", "Return true only when (), [] and {} match and are correctly nested.", "O(n) time and O(n) extra space."),
    ("max-subarray", "Maximum subarray — Kadane", "Find the maximum sum of a nonempty contiguous subarray.", "O(n) time and O(1) extra space."),
    ("merge-sorted", "Merge sorted arrays", "Merge two sorted arrays while preserving all duplicates.", "O(n+m) time and O(n+m) result space."),
    ("shortest-path", "Shortest path — BFS", "Find shortest edge distance in an unweighted undirected graph; -1 if unreachable.", "O(V+E) time and space."),
    ("first-unique", "First unique character", "Find the index of first uniquely occurring ASCII character, or -1.", "O(n) time and O(1) extra space."),
)


def build_java(course: Path, out: Path) -> dict:
    course = course.resolve()
    starter = (course / "src/starter/Tasks.java").read_text(encoding="utf-8")
    tests = (course / "tests/LabCheck.java").read_text(encoding="utf-8")
    readme = (course / "README.md").read_text(encoding="utf-8")
    if "class Tasks" not in starter or "class LabCheck" not in tests:
        raise ValueError("Java source or grader missing")
    entries = {}
    activities = []
    for task, title, prompt, complexity in TASKS:
        if f'"{task}"' not in tests:
            raise ValueError("Missing native test registration for " + task)
        method = {
            "two-sum": "twoSum", "move-zeros": "moveZeros",
            "lower-bound": "lowerBound", "valid-brackets": "validBrackets",
            "max-subarray": "maxSubarray", "merge-sorted": "mergeSorted",
            "shortest-path": "shortestPath", "first-unique": "firstUnique",
        }[task]
        if f" {method}(" not in starter:
            raise ValueError("Missing Java method " + method)
        id = "java/basics/drills/" + task
        entries[id] = {
            "id": id, "title": title, "sourcePath": "src/starter/Tasks.java",
            "guideHtml": (
                "<p>Start with the TODO method in <code>Tasks.java</code>.</p>"
                "<p>Run the check command; compare expected and actual outputs.</p>"
                "<p><strong>Complexity target:</strong> " + complexity + "</p>"
                "<details><summary>Full course guidance</summary><pre>"
                + readme.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                + "</pre></details>"
            ),
            "source": starter, "practiceFile": "src/starter/Tasks.java",
            "checkCommand": "make check TASK=" + task,
            "practiceCommand": "make reference TASK=" + task,
            "hint": "Use the method's TODO comment. " + complexity,
            "mode": "local-java", "graded": ["self-reported"],
            "challenge": {"function": method, "prompt": prompt,
                          "practiceFile": "src/starter/Tasks.java", "testSnippet": ""},
        }
        activities.append({"id": id, "title": title, "graded": 1})
    catalog = {"course": JAVA_REPO, "levels": [{
        "id": "basics", "title": "Practical Java & DSA", "medal": "🥉",
        "total": len(activities),
        "sections": [{"id": "exercises", "title": "Java 17 coding challenges", "items": activities}],
    }], "workbooks": {}}
    return output(out, "java", entries, catalog)
