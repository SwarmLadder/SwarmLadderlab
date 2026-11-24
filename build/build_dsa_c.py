"""Import the standalone DSA and C course repositories into static Lab catalogs.

DSA problems run against published cases in Pyodide, never a server judge.
C source stays native: the site saves drafts and asks for explicit local PASS.
"""
from __future__ import annotations
import json
import re
import html
from pathlib import Path

import shutil

try:
    from .build_git_rust import LEVELS, first_code, heading, html_guide
    from .dsa_notebooks import LessonBuilder
except ImportError:  # python build/prepare.py runs with build/ on sys.path
    from build_git_rust import LEVELS, first_code, heading, html_guide
    from dsa_notebooks import LessonBuilder

HERE = Path(__file__).resolve().parent

DSA_REPO = "https://github.com/SwarmLadder/Data-Structures-Algorithms"
C_REPO = "https://github.com/SwarmLadder/C"


def read(path: Path) -> str:
    if not path.is_file():
        raise FileNotFoundError(path)
    return path.read_text(encoding="utf-8")


def output(out: Path, name: str, entries: dict, catalog: dict) -> dict:
    root = out / "data" / name
    (root / "nb").mkdir(parents=True, exist_ok=True)
    for id, page in entries.items():
        (root / "nb" / (id.replace("/", "__") + ".json")).write_text(
            json.dumps(page, ensure_ascii=False, indent=1), encoding="utf-8")
    (root / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")
    return catalog


def dsa_short_explanation(markdown: str) -> str:
    """Return the upstream problem's short approach and complexity, not its full study."""
    approach = re.search(
        r"(?ms)^### A\. From baseline to the right data structure\s*\n(.*?)(?=^### |\Z)",
        markdown,
    )
    complexity = re.search(
        r"(?ms)^### E\. Complexity derivation\s*\n(.*?)(?=^### |\Z)",
        markdown,
    )
    if not approach or not complexity:
        raise ValueError("DSA solution is missing an approach or complexity summary")

    def first_paragraph(match: re.Match[str]) -> str:
        paragraph = match.group(1).strip().split("\n\n", 1)[0]
        return re.sub(r"\s+", " ", paragraph.replace("`", "")).strip()

    return "Approach: " + first_paragraph(approach) + " Complexity: " + first_paragraph(complexity)


def dsa_routes(course: Path) -> dict[str, str]:
    """Course source files that have a Lab page, so lesson links stay inside the Lab."""
    routes = {}
    for level, _, _ in LEVELS:
        for path in (course / "lessons" / level).glob("[0-9][0-9]_*.md"):
            routes[path.relative_to(course).as_posix()] = f"/lesson/dsa/{level}/lessons/{path.stem}"
        for path in (course / "worked_examples" / level).glob("[0-9][0-9]_*.md"):
            routes[path.relative_to(course).as_posix()] = f"/lesson/dsa/{level}/worked/{path.stem}"
        for folder in (course / "projects" / level).glob("[0-9][0-9]_*"):
            routes[(folder / "README.md").relative_to(course).as_posix()] = f"/lesson/dsa/{level}/builds/{folder.name}"
        prefix = {"basics": "B", "intermediate": "I", "advanced": "A"}[level]
        for n in range(1, 17):
            routes[f"problems/{prefix}{n:02}.md"] = f"/lesson/dsa/{level}/problems/{prefix}{n:02}"
    return routes


def build_dsa(course: Path, out: Path) -> dict:
    course = course.resolve()
    cases = json.loads(read(course / "tests/cases.json"))
    entries = {}
    catalog = {"course": DSA_REPO, "levels": [], "workbooks": {}}

    def add(level: str, section: str, slug: str, title: str, source_path: str,
            text: str, *, code: str = "", problem: dict | None = None) -> dict:
        id = f"dsa/{level}/{section}/{slug}"
        if id in entries:
            raise ValueError(f"Duplicate DSA activity {id}")
        page = {"id": id, "title": title, "sourcePath": source_path,
                "guideHtml": html_guide(text, source_path, DSA_REPO),
                "source": code, "mode": "browser-dsa" if problem else "reading-dsa",
                "graded": ["case-suite"] if problem else []}
        if problem:
            fixture = cases[problem["id"]]
            if len(fixture) != 6 or fixture[:2] != problem["examples"]:
                raise ValueError(f"DSA case mismatch: {problem['id']}")
            if len(problem["hints"]) < 2 or not problem["prompt"]:
                raise ValueError(f"Problem description too short: {problem['id']}")
            page.update({"problemId": problem["id"], "difficulty": problem["difficulty"],
                         "pattern": problem["pattern"], "prompt": problem["prompt"],
                         "constraints": problem["constraints"], "signature": problem["signature"],
                         "hints": problem["hints"], "cases": fixture,
                         "shortExplanation": dsa_short_explanation(text)})
        entries[id] = page
        return {"id": id, "title": title, "graded": 1 if problem else 0}

    revision = json.loads((HERE / "upstream.json").read_text())["Data-Structures-Algorithms"]
    routes = dsa_routes(course)
    builder = LessonBuilder(course, DSA_REPO, routes, revision)
    runtime = out / "course" / "dsa"
    for level, label, medal in LEVELS:
        lessons = []
        folder = runtime / level / "lessons"
        folder.mkdir(parents=True, exist_ok=True)
        for name in ("lesson.py", "quiz.py", "visual.py"):
            shutil.copy(HERE / "dsa_runtime" / name, folder / name)
        (folder / "drills.json").write_text(
            json.dumps(builder.runtime_drills(level), ensure_ascii=False), encoding="utf-8")
        for path in sorted((course / "lessons" / level).glob("[0-9][0-9]_*.md")):
            page = builder.notebook(level, path)
            if page["id"] in entries:
                raise ValueError(f"Duplicate DSA activity {page['id']}")
            entries[page["id"]] = page
            lessons.append({"id": page["id"], "title": page["title"], "graded": len(page["graded"])})
        if len(lessons) != 12:
            raise ValueError(f"Expected 12 DSA lessons for {level}, got {len(lessons)}")

        problems = json.loads(read(course / "problems" / (level + ".json")))
        expected_prefix = {"basics": "B", "intermediate": "I", "advanced": "A"}[level]
        if [p["id"] for p in problems] != [f"{expected_prefix}{i:02}" for i in range(1, 17)]:
            raise ValueError(f"Expected 16 consecutive DSA problems for {level}")
        activities = []
        for problem in problems:
            ident = problem["id"]
            starter_path = f"problems/starter/{ident}.py"
            starter = read(course / starter_path)
            if "NotImplementedError" not in starter or problem["signature"] not in starter:
                raise ValueError(f"Invalid DSA starter for {ident}")
            markdown_path = f"problems/{ident}.md"
            md = read(course / markdown_path)
            if "Deep solution study" not in md or "Reveal the complete" not in md:
                raise ValueError(f"Missing detailed problem study for {ident}")
            # The full explanation is intentionally collapsed behind <details>.
            activities.append(add(level, "problems", ident,
                                  f"{ident} — {problem['title']}",
                                  markdown_path, md, code=starter, problem=problem))
        projects = []
        project_number = {"basics": "01", "intermediate": "02", "advanced": "03"}[level]
        matches = list((course / "projects").glob(f"{project_number}_*.md"))
        if len(matches) != 1:
            raise ValueError(f"Expected one DSA project for {level}")
        file = matches[0]
        path = file.relative_to(course).as_posix()
        projects.append(add(level, "projects", file.stem, heading(read(file)), path, read(file)))

        mock_text = read(course / "interview/MOCK_INTERVIEWS.md")
        number = {"basics": 1, "intermediate": 2, "advanced": 3}[level]
        found = re.search(
            rf"(?ms)^## Round {number} — (.*?)(?=^## Round |\Z)", mock_text)
        if not found:
            raise ValueError(f"DSA mock interview Round {number} missing")
        rounds = [add(level, "interview", f"round-{number}",
                      f"Mock interview {number} — " + found.group(1).splitlines()[0],
                      "interview/MOCK_INTERVIEWS.md",
                      "# Round " + str(number) + " — " + found.group(1).strip())]
        worked = []
        for path in sorted((course / "worked_examples" / level).glob("[0-9][0-9]_*.md")):
            page = builder.worked_example(level, path)
            entries[page["id"]] = page
            worked.append({"id": page["id"], "title": page["title"], "graded": 0})
        if len(worked) != 6:
            raise ValueError(f"Expected 6 DSA worked examples for {level}, got {len(worked)}")
        builds = []
        tests_dir = runtime / level / "builds" / "tests"
        tests_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy(HERE / "dsa_runtime" / "lesson.py", runtime / level / "builds" / "lesson.py")
        for folder in sorted(p for p in (course / "projects" / level).glob("[0-9][0-9]_*") if p.is_dir()):
            page, tests = builder.project(level, folder)
            entries[page["id"]] = page
            (tests_dir / f"{folder.name}.py").write_text(tests, encoding="utf-8")
            builds.append({"id": page["id"], "title": page["title"], "graded": 1})
        if len(builds) != 2:
            raise ValueError(f"Expected 2 tested DSA projects for {level}, got {len(builds)}")
        # Section ids are unique per level: the roadmap and route key stages by them.
        catalog["levels"].append({
            "id": level, "title": label, "medal": medal, "total": len(activities),
            "sections": [
                {"id": "notebooks", "title": "Lessons", "items": lessons},
                {"id": "exercises", "title": "Interview problems", "items": activities},
                {"id": "worked_examples", "title": "Worked examples", "items": worked},
                {"id": "projects", "title": "Projects", "items": builds + projects},
                {"id": "interview", "title": "Timed mock interview", "items": rounds},
            ]})

    extras = [
        ("MASTERY_ROADMAP.md", "12-week mastery roadmap"),
        ("PROOF_TECHNIQUES.md", "Algorithm correctness proofs"),
        ("PATTERN_ATLAS.md", "Algorithm pattern atlas"),
        ("MASTERY_ASSESSMENT.md", "Mastery assessment"),
    ]
    level = catalog["levels"][2]
    extra = [add("advanced", "resources", Path(path).stem.lower(), title,
                 path, read(course / path)) for path, title in extras]
    level["sections"].append({"id": "resources", "title": "Mastery resources", "items": extra})
    return output(out, "dsa", entries, catalog)



def first_c_code(text: str) -> str:
    """Extract C examples fenced with three tildes or three backticks."""
    fence = "(?:" + re.escape(chr(96) * 3) + "|~~~)"
    match = re.search(r"(?ms)^" + fence + r"c\s*\n(.*?)\n" + fence, text)
    return match.group(1).strip() if match else ""



def c_workshop_drills(course: Path, level: str) -> list[dict]:
    """Turn 27 *actual native-tested C functions per level* into tasks.

    The upstream course.h is the canonical contract, tests/course.c the
    published expected behavior, and each starter .c the editable source.
    Each check is learner-verified locally; no browser C execution is implied.
    """
    header = read(course / "include/course.h")
    test_code = read(course / "tests/course.c")
    contracts: dict[str, str] = {}
    for match in re.finditer(r"/\*\*(.*?)\*/\s*([^;]+);", header, flags=re.S):
        comment = re.sub(r"\s*\n\s*\*\s?", " ", match.group(1)).strip()
        declaration = " ".join(match.group(2).split())
        name_match = re.search(r"(\w+)\s*\([^;{}]*\)$", declaration)
        if name_match:
            contracts[name_match.group(1)] = comment

    by_test = {}
    for match in re.finditer(
        r"(?ms)^static void test_(\w+)\(void\) \{(.*?)^\}", test_code
    ):
        by_test[match.group(1)] = (
            "static void test_" + match.group(1) + "(void) {"
            + match.group(2) + "}"
        )
    registered = set(re.findall(
        r'\{"(\w+)", "' + re.escape(level) + r'", test_\w+\}',
        test_code,
    ))
    drills = []
    consumed: set[str] = set()
    # Order by a beginner-friendly skill path, not alphabetically by filename.
    workshop_order = {
        "basics": ("clocks-and-units", "branches-and-boundaries",
                   "loop-invariants", "sequences-and-windows",
                   "characters-and-text", "records-and-reports"),
        "intermediate": ("output-parameters", "mutable-buffers",
                         "parsing-fields", "sorted-tables", "callbacks",
                         "streams"),
        "advanced": ("allocation-and-ownership", "linked-structures",
                     "binary-records", "circular-queues", "bit-sets",
                     "transactional-updates"),
    }
    workshops = [course / level / (name + ".md")
                 for name in workshop_order[level]]
    projects = sorted((course / level / "projects").glob("*.md"))
    for doc in [*workshops, *projects]:
        if doc.name == "README.md":
            continue
        md = read(doc)
        targets = list(dict.fromkeys(re.findall(r"make check TASK=(\w+)", md)))
        if not targets:
            raise ValueError(f"No C coding problems in {doc}")
        starter_path = f"{level}/starter/{doc.stem}.c"
        starter = read(course / starter_path)
        for name in targets:
            if name not in registered or name in consumed:
                raise ValueError(f"Unregistered or duplicate C task: {level}/{name}")
            if name not in contracts or name not in by_test:
                raise ValueError(f"Missing C contract or public test: {name}")
            if not re.search(r"\b" + re.escape(name) + r"\s*\(", starter):
                raise ValueError(f"Missing implementation stub for C task {name}")
            consumed.add(name)
            description = contracts[name]
            drills.append({
                "name": name,
                "title": name.replace("_", " ").capitalize(),
                "prompt": description,
                "sourcePath": doc.relative_to(course).as_posix(),
                "practiceFile": starter_path,
                "starter": starter,
                "guide": md,
                "testSnippet": by_test[name],
            })
    if consumed != registered or len(drills) != 27:
        raise ValueError(
            f"Expected 27 C drills for {level}; got {len(drills)} "
            f"(missing {sorted(registered - consumed)})"
        )
    return drills

def build_c(course: Path, out: Path) -> dict:
    course = course.resolve()
    entries = {}
    catalog = {"course": C_REPO, "levels": [], "workbooks": {}}

    def add(level: str, section: str, slug: str, title: str, source_path: str,
            markdown: str, *, code: str = "", check: str = "",
            practice: str = "", hint: str = "", task: dict | None = None) -> dict:
        id = f"c/{level}/{section}/{slug}"
        if id in entries:
            raise ValueError(f"Duplicate C activity {id}")
        entries[id] = {
            "id": id, "title": title, "sourcePath": source_path,
            "guideHtml": html_guide(markdown, source_path, C_REPO),
            "source": code, "checkCommand": check, "practiceCommand": practice,
            "hint": hint, "mode": "local-c",
            "graded": ["self-reported"] if check else [],
            "challenge": task,
            "practiceFile": task.get("practiceFile", "") if task else "",
        }
        return {"id": id, "title": title, "graded": int(bool(check))}

    interview = read(course / "curriculum/INTERVIEW.md")
    groups = {}
    for ix, (level, _, _) in enumerate(LEVELS):
        heading_name = ["Foundations", "Intermediate", "Advanced"][ix]
        match = re.search(
            rf"(?ms)^## {heading_name}\s*\n(.*?)(?=^## |\Z)", interview)
        if not match:
            raise ValueError(f"Missing C interview chapter {heading_name}")
        pairs = re.findall(
            r"(?ms)^### (\d+)\. (.+?)\n+(.*?)(?=^### \d+\. |^## |\Z)",
            match.group(1))
        if len(pairs) != 12:
            raise ValueError(f"Expected twelve C interviews in {heading_name}")
        groups[level] = pairs

    for level, label, medal in LEVELS:
        workshops = []
        for path in sorted((course / level).glob("*.md")):
            if path.name == "README.md":
                continue
            source = path.relative_to(course).as_posix()
            md = read(path)
            workshops.append(add(level, "workshops", path.stem,
                                 heading(md), source, md,
                                 code=first_c_code(md)))
        if len(workshops) != 6:
            raise ValueError(f"Expected six C workshops for {level}")

        drills = []
        for problem in c_workshop_drills(course, level):
            command = f"make check TASK={problem['name']}"
            challenge = {
                "function": problem["name"],
                "prompt": problem["prompt"],
                "practiceFile": problem["practiceFile"],
                "testSnippet": problem["testSnippet"],
            }
            # The same starter file contains four functions in a workshop.
            # A shared draft key in the UI keeps edits between those drills.
            drills.append(add(
                level, "drills", problem["name"],
                f"Code {problem['name']} — {problem['title']}",
                problem["sourcePath"], problem["guide"],
                code=problem["starter"], check=command,
                hint="Follow the contract and public test expectations. "
                     "Run the native checker before self-reporting a pass.",
                task=challenge,
            ))

        deep = []
        for path in sorted((course / level / "deep-dives").glob("[0-9][0-9]_*.md")):
            source = path.relative_to(course).as_posix()
            md = read(path)
            deep.append(add(level, "lessons", path.stem, heading(md), source,
                            md, code=first_c_code(md)))
        if len(deep) != 6:
            raise ValueError(f"Expected six C deep dives for {level}")

        labs = []
        indexes = {"basics": (1, 2, 7, 8), "intermediate": (3, 4, 9, 10),
                   "advanced": (5, 6, 11, 12)}[level]
        for number in indexes:
            path = next(iter(sorted((course / "mastery/tasks").glob(f"{number:02}_*.md"))), None)
            if path is None:
                raise ValueError(f"Missing C mastery lab {number:02}")
            md = read(path)
            # Match upstream lab numbering to the actual graded target names.
            mapped = {1: "checked_add", 2: "parse_decimal", 3: "text_buffer",
                      4: "byte_histogram", 5: "frame_header", 6: "topological",
                      7: "reverse_span", 8: "parse_hex", 9: "lower_bound",
                      10: "unique_sorted", 11: "ring_queue", 12: "dag_distances"}
            code_path = f"mastery/starter/{mapped[number]}.c"
            starter = read(course / code_path)
            if "TODO" not in starter:
                raise ValueError(f"Missing starter for C task {number}")
            command = f"make mastery-check TASK={mapped[number]}"
            labs.append(add(level, "labs", f"{number:02}-{mapped[number]}",
                            heading(md), path.relative_to(course).as_posix(),
                            md + "\n\nThe Lab does not compile or grade C. Run the "
                            "native C17 checker locally and mark verified only after PASS.",
                            code=starter, check=command, hint="C17: check bounds, ownership and failure semantics before committing output."))

        projects = []
        for path in sorted((course / level / "projects").glob("*.md")):
            md = read(path)
            projects.append(add(level, "projects", path.stem,
                                heading(md), path.relative_to(course).as_posix(), md))
        if len(projects) != 3:
            raise ValueError(f"Expected three C workshop projects for {level}")
        capstone = {"basics": "01", "intermediate": "02", "advanced": "03"}[level]
        matches = list((course / "mastery/projects").glob(f"{capstone}_*.md"))
        if len(matches) != 1:
            raise ValueError("Missing C systems capstone")
        project = matches[0]
        projects.append(add(level, "projects", project.stem,
                            heading(read(project)), project.relative_to(course).as_posix(),
                            read(project)))

        interviews = []
        for number, title, answer in groups[level]:
            md = (f"# Interview {int(number):02}: {title}\n\n"
                  "Explain the answer and discuss one counterexample before revealing it.\n\n"
                  "<details><summary>Reveal explained answer</summary>\n\n"
                  + answer.strip() + "\n\n</details>")
            interviews.append(add(level, "interview", f"{int(number):02}",
                                  f"Interview {int(number):02} — {title}",
                                  "curriculum/INTERVIEW.md", md))
        catalog["levels"].append({
            "id": level, "title": label, "medal": medal, "total": len(drills) + len(labs),
            "sections": [
                {"id": "exercises", "title": "Code it: 27 native C function drills", "items": drills},
                {"id": "notebooks", "title": "Professional C17 deep dives", "items": deep},
                {"id": "notebooks", "title": "Guided C workshops", "items": workshops},
                {"id": "exercises", "title": "Native C17 graded mastery labs", "items": labs},
                {"id": "projects", "title": "C portfolio and systems projects", "items": projects},
                {"id": "worked_examples", "title": "C interview explanations", "items": interviews},
            ]})
    extra = [
        ("curriculum/ROADMAP.md", "12-week C learning roadmap"),
        ("curriculum/ASSESSMENT.md", "C mastery assessment rubric"),
        ("curriculum/DEBUGGING_CLINIC.md", "Eight debugging investigations"),
        ("curriculum/EDGE_CASE_MATRIX.md", "Adversarial C test matrix"),
        ("examples/telemetry_reader/README.md", "Real C telemetry reference project"),
    ]
    advanced = catalog["levels"][2]
    misc = [add("advanced", "resources", path.split("/")[-1].removesuffix(".md").lower(),
                title, path, read(course / path)) for path, title in extra]
    advanced["sections"].append({"id": "worked_examples", "title": "C engineering resources", "items": misc})
    return output(out, "c", entries, catalog)
