"""Build Linux & Bash activities from the upstream SwarmLadder/linux-course repo.

True Bash execution and grading happen locally. The browser terminal simulator
offers a deliberately small, safe set of educational commands.
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from build_git_rust import LEVELS, html_guide, first_code, heading

REPO = "https://github.com/SwarmLadder/linux-course"


def read(path: Path) -> str:
    if not path.is_file():
        raise FileNotFoundError(path)
    return path.read_text(encoding="utf-8")


def questions(path: Path, count: int) -> list[tuple[int, str]]:
    pairs = re.findall(r"(?m)^(\d+)\.\s+(.+)$", read(path))
    if len(pairs) != count or [int(n) for n, _ in pairs] != list(range(1, count + 1)):
        raise ValueError(f"{path}: expected {count} consecutively numbered exercises")
    return [(int(n), text) for n, text in pairs]


def build_linux(course: Path, out: Path) -> dict:
    course = course.resolve()
    tasks = json.loads(read(course / "labs/tasks.json"))
    if len(tasks) != 12 or len({t["id"] for t in tasks}) != 12:
        raise ValueError("Expected 12 distinct Linux practice labs")
    entries = {}
    catalog = {"course": REPO, "levels": [], "workbooks": {}}

    def add(level, kind, slug, title, markdown, path, *, code="", graded=False,
            check="", hint="", practice=""):
        uid = f"linux/{level}/{kind}/{slug}"
        if uid in entries:
            raise ValueError(f"Duplicate Linux activity {uid}")
        entries[uid] = {
            "id": uid, "title": title, "guideHtml": html_guide(markdown, path, REPO),
            "sourcePath": path, "source": code, "checkCommand": check,
            "practiceCommand": practice,
            "graded": ["self-reported"] if graded else [],
            "mode": "local-linux", "hint": hint,
        }
        return {"id": uid, "title": title, "graded": int(graded)}

    for level, label, medal in LEVELS:
        lessons = []
        for path in sorted((course / level / "lessons").glob("[0-9][0-9]_*.md")):
            source = path.relative_to(course).as_posix()
            md = read(path)
            lessons.append(add(level, "lessons", path.stem, heading(md), md,
                               source, code=first_code(md, "bash")))
        if len(lessons) != 12:
            raise ValueError(f"Linux {level}: expected 12 lessons, got {len(lessons)}")

        labs = []
        for task in tasks:
            if task["level"] != level:
                continue
            ident = task["id"]
            starter = read(course / "labs/starter" / task["script"])
            if "Write your solution" not in starter and "Implement the solution" not in starter:
                raise ValueError(f"Unexpected Linux lab starter: {ident}")
            check = f"python tools/grade.py {ident}"
            md = (f"# {ident} — {task['title']}\n\n"
                  f"**Goal:** {task['prompt']}\n\n"
                  "Write a Bash solution in your local course checkout. The actual "
                  "two-fixture grader runs on Linux or WSL2, not in the web browser. "
                  "The browser simulator only supports a small safe command subset.\n\n"
                  "Run locally:\n\n" + chr(96)*3 + "bash\n" + check + "\n" +
                  chr(96)*3 + "\n\n"
                  "Mark complete after you see PASS. The mark is your confirmation, "
                  "not an automatic web verification.")
            labs.append(add(level, "labs", ident, f"{ident} — {task['title']}",
                            md, "labs/tasks.json", code=starter, graded=True,
                            check=check, hint=task["prompt"]))
        if len(labs) != 4:
            raise ValueError(f"Linux {level}: expected four local labs")

        exercises = []
        for number, exercise in questions(course / "exercises" / f"{level}.md", 25):
            md = (f"# Practice {number:02} — {exercise}\n\n"
                  "**Independent exercise.** Work in a disposable directory on "
                  "Linux or WSL2. Document expected output, a failing case and "
                  "the exit code. Your draft is saved in this browser, but the "
                  "Lab does not auto-grade independent Linux exercises.\n\n"
                  "Confirm completion once you have tested your work.")
            exercises.append(add(level, "practice", f"{number:02}",
                                 f"Practice {number:02} — {exercise}",
                                 md, f"exercises/{level}.md",
                                 code="# Enter the Bash commands you tested locally\n",
                                 graded=True))

        interviews = []
        for number, qa in questions(course / "interview" / f"{level}.md", 20):
            found = re.match(r"\*\*(.+?)\*\*\s*(.+)", qa)
            if not found:
                raise ValueError(f"Malformed interview answer {level}/{number}")
            question, answer = found.groups()
            md = (f"# Interview {number:02} — {question}\n\n"
                  "Explain the concept before opening the answer.\n\n"
                  "<details><summary>Reveal explanation</summary>\n\n"
                  + answer + "\n\n</details>\n\n"
                  "Support your explanation with a safe example.")
            interviews.append(add(level, "interview", f"{number:02}",
                                  f"Interview {number:02} — {question}",
                                  md, f"interview/{level}.md"))

        number = {"basics": "01", "intermediate": "02", "advanced": "03"}[level]
        matches = list((course / "projects").glob(f"{number}_*.md"))
        if len(matches) != 1:
            raise ValueError(f"Linux {level}: expected one project")
        path = matches[0]
        md = read(path)
        projects = [add(level, "projects", path.stem, heading(md), md,
                        path.relative_to(course).as_posix(),
                        code=first_code(md, "bash"))]

        catalog["levels"].append({
            "id": level, "title": label, "medal": medal,
            "sections": [
                {"id": "notebooks", "title": "Linux & Bash lessons", "items": lessons},
                {"id": "exercises", "title": "Locally graded Bash labs", "items": labs},
                {"id": "exercises", "title": "Independent exercises", "items": exercises},
                {"id": "worked_examples", "title": "Interview questions", "items": interviews},
                {"id": "projects", "title": "Portfolio project", "items": projects},
            ],
            "total": len(labs) + len(exercises),
        })

    root = out / "data/linux"
    (root / "nb").mkdir(parents=True, exist_ok=True)
    for uid, activity in entries.items():
        (root / "nb" / (uid.replace("/", "__") + ".json")).write_text(
            json.dumps(activity, ensure_ascii=False, indent=1), encoding="utf-8")
    (root / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
    return catalog
