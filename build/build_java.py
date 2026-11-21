"""Import the standalone Java 17 practice repository into the Lab.

Java tasks have native JDK checks. No browser JVM/compiler is implied.
"""
from __future__ import annotations

import json
from pathlib import Path

try:
    from .build_dsa_c import output
except ImportError:
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


JAVA_EXAMPLES = {
    "two-sum": ("values=[2,7,11,15], target=9", "[0,1]", "Store each earlier value in a map. For each new number, find its required complement before inserting it."),
    "move-zeros": ("[0,5,0,3,12,0,7]", "[5,3,12,7,0,0,0]", "Write nonzero values forward in their original order, then fill the remaining cells with zeros."),
    "lower-bound": ("values=[1,2,2,2,5], target=2", "1", "Binary-search a half-open interval, keeping the first valid index inside the remaining interval."),
    "valid-brackets": ('"([]){}"', "true", "Push opening brackets and match each closing bracket against the most recent opening one."),
    "max-subarray": ("[-2,1,-3,4,-1,2,1,-5,4]", "6", "At each number, either restart the running sum or extend the previous subarray."),
    "merge-sorted": ("[1,2,4] and [1,3,4]", "[1,1,2,3,4,4]", "Compare the next elements of both sorted inputs and append the smaller one."),
    "shortest-path": ("4 vertices, edges 0-1-2-3, from 0 to 3", "3", "Breadth-first search explores vertices in increasing distance from the start."),
    "first-unique": ('"leetcode"', "0", "Count character frequencies, then scan from left to right for the first count of one."),
}

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
        example_input, example_output, reason = JAVA_EXAMPLES[task]
        id = "java/basics/drills/" + task
        entries[id] = {
            "id": id, "title": title, "sourcePath": "src/starter/Tasks.java",
            "guideHtml": (
                "<p><strong>Example input:</strong> <code>" + example_input + "</code></p>"
                "<p><strong>Expected output:</strong> <code>" + example_output + "</code></p>"
                "<p>Start with the TODO method in <code>Tasks.java</code>.</p>"
                "<p>Run the check command; compare expected and actual outputs.</p>"
                "<p><strong>Short explanation:</strong> " + reason + "</p>"
                "<p><strong>Complexity target:</strong> " + complexity + "</p>"
                "<details><summary>Full course guidance</summary><pre>"
                + readme.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                + "</pre></details>"
            ),
            "source": starter, "practiceFile": "src/starter/Tasks.java",
            "checkCommand": "make check TASK=" + task,
            "practiceCommand": "",
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
