"""Turn DSA course lessons into interactive Lab notebooks.

A lesson keeps its own teaching text. Every ```python block becomes a runnable
cell, each lesson drill becomes an editable starter with a check against its
six published cases, and the quick quiz is graded with the course's answer
hashes. Nothing is invented: prompts, starters, cases, hints and quiz text all
come from the DSA repository.
"""
from __future__ import annotations

import ast
import hashlib
import html
import sys
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


VISUAL_PRELUDE = "import heapq\nfrom collections import deque, defaultdict\n"


def resolve(frames: list[dict], name: str, objects: dict):
    """A view's variable (or dotted path through objects) in the innermost frame that has it."""
    head, *rest = name.split(".")
    for frame in reversed(frames):
        if head in frame["locals"]:
            value = frame["locals"][head]
            for part in rest:
                if not (isinstance(value, dict) and "$ref" in value):
                    return None
                value = objects[value["$ref"]]["fields"].get(part)
            return value
    return None


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
        self.visuals: dict[str, list[dict]] = {}
        for visual in json.loads((Path(__file__).with_name("dsa_visuals.json")).read_text(encoding="utf-8")):
            self.visuals.setdefault(visual["lesson"], []).append(visual)
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
        visuals = self.visuals.get(f"{level}/{path.stem}", [])
        if visuals:
            cells.append({"type": "md", "html": "<h2>See it run</h2><p>Step through a real run of this lesson's code: "
                          "every state below is what Python executed, line by line. Predict the next state before you step. "
                          "Edit the code or the input and trace again to test your own idea.</p>"})
            for n, visual in enumerate(visuals, 1):
                cells.append(self.visual_cell(path, visual, n))
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

    def visual_cell(self, path: Path, visual: dict, number: int) -> dict:
        """The lesson's own functions plus a driver call, verified by tracing them now."""
        text = re.sub(r"(?s)<!-- output -->.*?<!-- /output -->", "", path.read_text(encoding="utf-8"))
        blocks = [m.group(2) for m in FENCE.finditer(text) if m.group(1) in ("python", "py")]
        parts = []
        for name in visual["functions"]:
            for block in blocks:
                try:
                    tree = ast.parse(block)
                except SyntaxError:
                    continue
                node = next((n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name == name), None)
                if node is not None:
                    parts.append(ast.get_source_segment(block, node))
                    break
            else:
                raise ValueError(f"{path.name}: no definition of {name} for the visualizer")
        source = VISUAL_PRELUDE + "\n\n" + "\n\n\n".join(parts) + "\n"
        sys.path.insert(0, str(Path(__file__).with_name("dsa_runtime")))
        try:
            from visual import trace
        finally:
            sys.path.pop(0)
        run = trace(source, visual["driver"])
        if run["error"] or run["truncated"] or len(run["steps"]) < 5:
            raise ValueError(f"{path.name}: visual {visual['title']!r} did not trace cleanly: {run['error']}")
        for view in visual["views"]:
            names = view["of"] if isinstance(view["of"], list) else [view["of"]]
            names += [n for key in ("pointers",) for n in view.get(key, [])]
            names += [view[k] for k in ("current", "focus", "labels", "indexInto", "stack", "rows", "cols") if isinstance(view.get(k), str)]
            names += [n for n in view.get("range", [])[:2]] + list(view.get("cell", []))
            for name in names:
                if not any(resolve(step["frames"], name, step["objects"]) is not None for step in run["steps"]):
                    raise ValueError(f"{path.name}: visual {visual['title']!r} never sees {name!r}")
        return {"type": "code", "id": f"visual-{number}", "kind": "visual", "source": source,
                "driver": visual["driver"], "title": visual["title"], "watch": visual["watch"],
                "views": visual["views"], "steps": len(run["steps"]), "requires_cells": [], "assessment": None}


def dsa_concepts(course: Path) -> dict:
    """The DSA concept map, with every prerequisite checked against the lessons themselves."""
    spec = json.loads((Path(__file__).with_name("dsa_concepts.json")).read_text(encoding="utf-8"))
    order = list(LEVEL_PREFIX)
    paths = {f"{p.parent.name}/{p.stem[:2]}": p for level in order for p in (course / "lessons" / level).glob("[0-9][0-9]_*.md")}
    lesson_id = lambda key: f"dsa/{key.split('/')[0]}/lessons/{paths[key].stem}"
    rank = lambda key: (order.index(key.split("/")[0]), key.split("/")[1])

    def taught(text: str) -> str:
        # What a lesson explicitly teaches: its title, outcome and section headings.
        heads = re.findall(r"(?m)^#{1,3} (.+)$", text) + re.findall(r"(?m)^\*\*Outcome:\*\*(.+)$", text)
        return " ".join(heads).lower()

    staged = [k for stage in spec["stages"] for k in (f"{stage[3]}/{n}" for n in stage[4])]
    if sorted(staged) != sorted(paths) or len(staged) != len(set(staged)):
        raise ValueError("every DSA lesson must belong to exactly one roadmap stage")
    entries = []
    for key in sorted(paths, key=rank):
        text = paths[key].read_text(encoding="utf-8")
        title = text.splitlines()[0].removeprefix("# ").strip()
        outcome = re.search(r"(?m)^\*\*Outcome:\*\*\s*(.+)$", text)
        prerequisites, why = [], {}
        for prereq, reason, evidence in spec["lessons"].get(key, []):
            if prereq not in paths or rank(prereq) >= rank(key):
                raise ValueError(f"{key}: prerequisite {prereq} must be an earlier lesson")
            other = paths[prereq].read_text(encoding="utf-8")
            for term in evidence:
                if term.lower() not in text.lower():
                    raise ValueError(f"{key} does not use {term!r}, so it cannot depend on {prereq} for it")
                if term.lower() not in taught(other):
                    raise ValueError(f"{prereq} does not teach {term!r} in its title, outcome or headings")
            prerequisites.append(lesson_id(prereq))
            why[lesson_id(prereq)] = reason
        stage = next(s[0] for s in spec["stages"] if s[3] == key.split("/")[0] and key.split("/")[1] in s[4])
        # The outcome sentence only: some lessons continue the line with "**Time:** …".
        skill = re.split(r"\s*\*\*", outcome.group(1))[0].strip() if outcome else ""
        skill = skill[:1].upper() + skill[1:]
        entries.append({"id": lesson_id(key), "concept": title, "skill": skill,
                        "prerequisites": prerequisites, "why": why, "stage": stage})
    stages = [{"id": s[0], "title": s[1], "summary": s[2], "level": s[3],
               "lessons": [lesson_id(f"{s[3]}/{n}") for n in s[4]]} for s in spec["stages"]]
    return {"stages": stages, "concepts": entries}
