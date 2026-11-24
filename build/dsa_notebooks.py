"""Turn DSA course lessons into interactive Lab notebooks.

A lesson keeps its own teaching text. Every ```python block becomes a runnable
cell, each lesson drill becomes an editable starter with a check against its
six published cases, and the quick quiz is graded with the course's answer
hashes. Nothing is invented: prompts, starters, cases, hints and quiz text all
come from the DSA repository.
"""
from __future__ import annotations

import hashlib
import html
import json
import posixpath
import re
from pathlib import Path
from urllib.parse import quote, urlsplit

import markdown

FENCE = re.compile(r"(?ms)^```([\w-]*)[^\n]*\n(.*?)^```[ \t]*$\n?")
LEVEL_PREFIX = {"basics": "B", "intermediate": "I", "advanced": "A"}


def quiz_fingerprint(key: str, number: int, choice: str) -> str:
    return hashlib.sha256(f"dsa-course-quiz|{key}|{number}|{choice.strip().lower()}".encode()).hexdigest()[:12]


def render(md: str, source_path: str, routes: dict[str, str], repo: str) -> str:
    """Markdown to HTML; course-relative links go to Lab pages when imported, else GitHub."""
    result = markdown.markdown(md, extensions=["fenced_code", "tables", "sane_lists"])
    folder = posixpath.dirname(source_path)

    def fix(match: re.Match) -> str:
        before, href, after = match.groups()
        if href.startswith(("https://", "http://", "#", "/", "mailto:", "data:")):
            return match.group(0)
        parts = urlsplit(html.unescape(href))
        if parts.scheme or parts.netloc:
            return match.group(0)
        dest = posixpath.normpath(posixpath.join(folder, parts.path))
        if dest == ".." or dest.startswith("../"):
            return match.group(0)
        if dest in routes:
            url = routes[dest]
        else:
            url = repo + "/blob/main/" + quote(dest, safe="/")
        if parts.fragment:
            url += "#" + quote(parts.fragment, safe="-_")
        return before + html.escape(url, quote=True) + after

    return re.sub(r'(<a\s+[^>]*?href=")([^"]+)(")', fix, result)


def starter_body(text: str) -> str:
    """The drill starter without its CLI docstring or the `___ = None` placeholder."""
    text = re.sub(r'(?s)\A\s*""".*?"""\s*', "", text)
    text = re.sub(r"(?m)^___ = None.*\n", "", text)
    return text.strip() + "\n"


def between(text: str, tag: str) -> tuple[str, str, str]:
    start, end = f"<!-- {tag} -->", f"<!-- /{tag} -->"
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f"expected one {tag} block")
    head, rest = text.split(start)
    body, tail = rest.split(end)
    return head, body, tail


class LessonBuilder:
    def __init__(self, course: Path, repo: str, routes: dict[str, str], revision: str):
        self.course = course
        self.repo = repo
        self.routes = routes
        self.revision = revision
        bank: dict[str, dict] = {}
        for level in LEVEL_PREFIX:
            for drill in json.loads((course / "drills" / f"{level}.json").read_text(encoding="utf-8")):
                bank[drill["id"]] = drill
        self.drills = bank
        self.cases = json.loads((course / "drills/cases.json").read_text(encoding="utf-8"))
        self.quizzes: dict[str, dict] = {}
        for level in LEVEL_PREFIX:
            self.quizzes.update(json.loads((course / "quizzes" / f"{level}.json").read_text(encoding="utf-8")))

    def runtime_drills(self, level: str) -> dict:
        """drills.json for the browser grader of one level: prompt, hints and cases only."""
        result = {}
        for did, drill in self.drills.items():
            if drill["level"] == level:
                cases = self.cases[did]
                if len(cases) != 6:
                    raise ValueError(f"{did} must have six published cases")
                result[did] = {"title": drill["title"], "hints": drill["hints"], "cases": cases}
        return result

    def notebook(self, level: str, path: Path) -> dict:
        source_path = path.relative_to(self.course).as_posix()
        number = path.stem[:2]
        key = f"{level}/{number}"
        lesson_id = f"dsa/{level}/lessons/{path.stem}"
        text = path.read_text(encoding="utf-8")
        text = re.sub(r"(?s)<!-- output -->.*?<!-- /output -->\s*", "", text)  # learners run it themselves
        text = re.sub(r"\s*\(or `python -m tools\.lessons`[^)]*\)", "", text)
        text = text.replace("<!-- lesson-practice -->", "")
        text = self.link_problems(text)
        before_drills, drills_md, after_drills = between(text, "drills")
        between_parts, quiz_md, after_quiz = between(after_drills, "quiz")

        cells: list[dict] = []
        graded: list[str] = []
        counter = {"demo": 0}
        self.prose(before_drills, cells, counter, source_path)
        # Setup goes before the first runnable cell, as in Python notebooks.
        setup = {"type": "code", "id": "lesson-setup", "kind": "setup",
                 "source": f"from lesson import Exercises, ___\n\ncheck = Exercises({lesson_id!r})",
                 "requires_cells": [], "assessment": None}
        first_code = next((i for i, c in enumerate(cells) if c["type"] == "code"), len(cells))
        cells.insert(first_code, setup)

        lesson_drills = [d for d in self.drills.values() if d["lesson"] == source_path]
        listed = re.findall(r"`(D[BIA]\d{2})`", drills_md)
        if [d["id"] for d in lesson_drills] != listed or len(listed) != 4:
            raise ValueError(f"{source_path}: drill table and drill bank disagree: {listed}")
        intro = drills_md.split("\n\n")[0].strip()
        cells.append({"type": "md", "html": render(intro, source_path, self.routes, self.repo)})
        for drill in lesson_drills:
            graded.append("wb:" + drill["id"])
            cells.extend(self.drill_cells(drill))

        self.prose(between_parts, cells, counter, source_path)
        questions = self.quiz_cells(key, quiz_md, source_path)
        cells.extend(questions["cells"])
        graded.extend(f"q{n}" for n in range(1, questions["count"] + 1))
        self.prose(after_quiz, cells, counter, source_path)
        title = text.splitlines()[0].removeprefix("# ").strip()
        return {"id": lesson_id, "title": title, "folder": f"dsa/{level}/lessons", "cells": cells,
                "revision": self.revision, "graded": graded, "sourcePath": source_path,
                "quizFeedback": questions["feedback"]}

    def link_problems(self, text: str) -> str:
        """`B04` opens that interview problem in the Lab; `DB09` opens the drill in its lesson."""
        def link(match: re.Match) -> str:
            ident = match.group(1)
            level = {v: k for k, v in LEVEL_PREFIX.items()}[ident[0]]
            return f"[`{ident}`](/lesson/dsa/{level}/problems/{ident})"

        def drill(match: re.Match) -> str:
            ident = match.group(1)
            lesson = self.drills[ident]["lesson"]
            return f"[`{ident}`]({self.routes[lesson]}#cell-drill-{ident})"
        text = re.sub(r"(?<!\[)`([BIA]\d{2})`", link, text)
        text = re.sub(r"(?<!\[)`(D[BIA]\d{2})`", drill, text)
        return re.sub(r"\. Read one with `python -m tools\.practice show [^`]+`\.", ".", text)

    def prose(self, md: str, cells: list[dict], counter: dict, source_path: str) -> None:
        """Markdown with each ```python block as a runnable example cell."""
        at = 0
        for match in FENCE.finditer(md):
            lang, code = match.group(1), match.group(2)
            if lang not in ("python", "py"):
                continue
            self.text(md[at:match.start()], cells, source_path)
            counter["demo"] += 1
            cells.append({"type": "code", "id": f"demo-{counter['demo']}", "kind": "code",
                          "source": code.rstrip() + "\n", "requires_cells": [], "assessment": None})
            at = match.end()
        self.text(md[at:], cells, source_path)

    def text(self, md: str, cells: list[dict], source_path: str) -> None:
        # Command-line instructions for the offline course are not needed in the browser.
        md = FENCE.sub(lambda m: "" if m.group(1) == "bash" and "tools." in m.group(2) else m.group(0), md)
        # Start a new cell at every heading so each section becomes its own step.
        for chunk in re.split(r"(?m)^(?=#{1,3} )", md):
            if chunk.strip():
                cells.append({"type": "md", "html": render(chunk.strip(), source_path, self.routes, self.repo)})

    def drill_cells(self, drill: dict) -> list[dict]:
        did = drill["id"]
        starter = (self.course / "drills/starter" / f"{did}.py").read_text(encoding="utf-8")
        body = starter_body(starter)
        if drill["signature"] not in body:
            raise ValueError(f"{did}: starter does not define {drill['signature']}")
        guided = drill["kind"] == "guided"
        if guided != ("___" in body):
            raise ValueError(f"{did}: guided drills, and only they, have ___ blanks")
        examples = "".join(
            f"<li><code>solve({html.escape(', '.join(json.dumps(a, ensure_ascii=False) for a in case['args']))})</code>"
            f" → <code>{html.escape(json.dumps(case['expected'], ensure_ascii=False))}</code></li>"
            for case in self.cases[did][:2])
        kind = ("Guided: fill in each <code>___</code> blank." if guided
                else "Independent: write the whole function.")
        md = (f"<h3>{did} · {html.escape(drill['title'])}</h3>"
              f"<p>{html.escape(drill['prompt'])}</p>"
              f"<p class=\"drill-kind\">{kind} Checked on six published cases; a hint appears after each failed check.</p>"
              f"<p>Examples:</p><ul>{examples}</ul>")
        return [
            {"type": "md", "html": md},
            {"type": "code", "id": f"drill-{did}", "kind": "code", "source": body,
             "requires_cells": [], "assessment": None},
            {"type": "code", "id": f"drill-{did}-check", "kind": "check", "source": f"check('{did}')",
             "requires_cells": [f"drill-{did}"], "assessment": "wb:" + did},
        ]

    def quiz_cells(self, key: str, md: str, source_path: str) -> dict:
        quiz = self.quizzes[key]
        if quiz["lesson"] != source_path:
            raise ValueError(f"quiz {key} belongs to {quiz['lesson']}")
        questions = quiz["questions"]
        lines = [f"**{n}.** {q['question']}\n\n" + "\n".join(f"- **{letter})** {text}" for letter, text in q["options"].items())
                 for n, q in enumerate(questions, 1)]
        for n, q in enumerate(questions, 1):
            if not any(quiz_fingerprint(key, n, letter) == q["answer"] for letter in q["options"]):
                raise ValueError(f"quiz {key} question {n} has no matching answer")
        intro = "Choose an answer for each question. Answers are checked against hashes, so the page does not reveal them."
        answers = ", ".join(f"{n}: {q['answer']!r}" for n, q in enumerate(questions, 1))
        body = "\n".join(f"quiz.answer({n}, '?')" for n in range(1, len(questions) + 1))
        return {
            "count": len(questions),
            "feedback": {str(n): {"explain": q["explain"], "section": q["section"]} for n, q in enumerate(questions, 1)},
            "cells": [
                {"type": "md", "html": render(intro + "\n\n" + "\n\n".join(lines), source_path, self.routes, self.repo)},
                {"type": "code", "id": "quiz-check", "kind": "quiz",
                 "source": f"from quiz import Quiz\n\nquiz = Quiz({key!r}, {{{answers}}})\n{body}",
                 "requires_cells": [], "assessment": None},
            ],
        }

    def worked_example(self, level: str, path: Path) -> dict:
        """Plan, tempting attempt, fix and randomized test: every code block runs in the browser."""
        source_path = path.relative_to(self.course).as_posix()
        text = path.read_text(encoding="utf-8")
        text = re.sub(r"(?s)<!-- output -->.*?<!-- /output -->\s*", "", text)
        text = self.link_problems(text)
        cells: list[dict] = []
        self.prose(text, cells, {"demo": 0}, source_path)
        if sum(c["type"] == "code" for c in cells) < 3:
            raise ValueError(f"{source_path}: a worked example needs its attempt, fix and test")
        title = text.splitlines()[0].removeprefix("# ").strip()
        title = re.sub(r"^Worked example \w+ · ", "", title)
        return {"id": f"dsa/{level}/worked/{path.stem}", "title": title, "folder": f"dsa/{level}/worked",
                "cells": cells, "revision": self.revision, "graded": [], "sourcePath": source_path}

    def project(self, level: str, folder: Path) -> tuple[dict, str]:
        """A tested project: the brief, the starter module, the course's own unittest suite."""
        source_path = (folder / "README.md").relative_to(self.course).as_posix()
        brief = self.link_problems((folder / "README.md").read_text(encoding="utf-8"))
        starter = (folder / "starter.py").read_text(encoding="utf-8")
        tests = (folder / "test_project.py").read_text(encoding="utf-8")
        header = re.compile(
            r'(?m)^_path = Path\(os\.environ\.get\("DSA_PROJECT_IMPL".*\n'
            r'_spec = importlib\.util\.spec_from_file_location\("project_impl", _path\)\n'
            r'impl = importlib\.util\.module_from_spec\(_spec\)\n'
            r'_spec\.loader\.exec_module\(impl\)\n')
        if len(header.findall(tests)) != 1:
            raise ValueError(f"{folder}: unexpected test header; cannot run its suite in the browser")
        browser_tests = header.sub("impl = __project_impl__  # the Lab passes in your code\n", tests)
        if "NotImplementedError" not in starter:
            raise ValueError(f"{folder}: the starter must leave the work to the learner")
        cells: list[dict] = []
        intro, _, rest = brief.partition("## Deliverables")
        self.text(intro, cells, source_path)
        cells.insert(next(i for i, c in enumerate(cells) if c["type"] == "md") + 1, {
            "type": "code", "id": "lesson-setup", "kind": "setup",
            "source": f"from lesson import Exercises\n\ncheck = Exercises('dsa/{level}/builds/{folder.name}')",
            "requires_cells": [], "assessment": None})
        cells.append({"type": "md", "html": "<h2>Your implementation</h2><p>Implement every ticket in this module. "
                      "The check runs the project's own test suite from the DSA course, including its randomized "
                      "tests against an independent oracle. Passing it is evidence for these tests, not a proof.</p>"})
        cells.append({"type": "code", "id": "build-work", "kind": "code", "source": starter.rstrip() + "\n",
                      "requires_cells": [], "assessment": None})
        cells.append({"type": "code", "id": "build-check", "kind": "check", "source": "check('project')",
                      "requires_cells": ["build-work"], "assessment": "wb:project"})
        if rest.strip():
            self.text("## Deliverables" + rest, cells, source_path)
        cells.append({"type": "code", "id": "engineering-work", "kind": "engineering",
                      "source": "# Complexity of each function, and one extra test of your own:\n",
                      "requires_cells": [], "assessment": None})
        title = brief.splitlines()[0].removeprefix("# ").strip()
        title = re.sub(r"^Project \w+ · ", "", title)
        page = {"id": f"dsa/{level}/builds/{folder.name}", "title": title, "folder": f"dsa/{level}/builds",
                "cells": cells, "revision": self.revision, "graded": ["wb:project"], "sourcePath": source_path}
        return page, browser_tests
