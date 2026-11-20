"""Build the complete SQLite course from SwarmLadder/SQL for the Lab.

Guides, projects and runnable examples stay in the course repository. The Lab
receives the catalog, safe read-only challenge fixtures and expected digests,
but never ships reference SQL solutions or the Python reference checker.
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path

import markdown

LEVELS = (("basics", "Basics", "🥉"),
          ("intermediate", "Intermediate", "🥈"),
          ("advanced", "Advanced", "🥇"))
REPO = "https://github.com/SwarmLadder/SQL"


def digest(rows: tuple[tuple, ...]) -> str:
    # Match the browser grader's Python JSON canonical representation.
    encoded = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def render(md: str) -> str:
    html = markdown.markdown(md, extensions=["fenced_code", "tables", "sane_lists"])
    # The Lab already displays the lesson title in its page header.
    return re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", html, count=1, flags=re.S)


def build_sql(course: Path, out: Path) -> dict:
    """Build SQL files into OUT/{data/sql,course/sql}; return the catalog."""
    course = course.resolve()
    if not (course / "interview" / "basics.json").is_file():
        raise FileNotFoundError(f"SQL curriculum is missing at {course}")
    sys.path.insert(0, str(course / "tools"))
    from interview_practice import execute, sample_db

    entries: dict[str, dict] = {}
    catalog = {"course": REPO, "levels": [], "workbooks": {}}
    for level, label, medal in LEVELS:
        sections = []

        def put(section: str, path: str, title: str, guide: str, sql: str,
                source: str, *, runnable: bool = True, grade: dict | None = None,
                hint: str = "", dialect: str = "sqlite", schema_task: str = ""):
            lesson_id = f"sql/{level}/{section}/{path}"
            item = {
                "id": lesson_id,
                "title": title,
                "graded": 1 if grade or schema_task else 0,
            }
            entries[lesson_id] = {
                "id": lesson_id,
                "title": title,
                "guideHtml": render(guide),
                "source": sql,
                "sourcePath": source,
                "dialect": dialect,
                "runnable": runnable,
                "grade": grade,
                "schemaTask": schema_task or None,
                "graded": ["challenge"] if grade or schema_task else [],
                "hint": hint,
            }
            return item

        lessons = []
        for md in sorted((course / level / "lessons").glob("*.md")):
            sql_file = md.with_suffix(".sql")
            if not sql_file.is_file():
                raise FileNotFoundError(sql_file)
            title = md.read_text(encoding="utf-8").splitlines()[0].removeprefix("# ").strip()
            lessons.append(put("lessons", md.stem, title,
                               md.read_text(encoding="utf-8"),
                               sql_file.read_text(encoding="utf-8"),
                               sql_file.relative_to(course).as_posix()))
        sections.append({"id": "notebooks", "title": "Guided lessons", "items": lessons})

        challenges = []
        questions = json.loads((course / "interview" / f"{level}.json").read_text(encoding="utf-8"))
        for q in questions:
            qid = q["id"]
            if q["level"] != level:
                raise ValueError(f"Incorrect level for {qid}")
            ref = course / "interview" / "reference" / f"{qid}.sql"
            starter = course / "interview" / "starter" / f"{qid}.sql"
            solution = ref.read_text(encoding="utf-8")
            signatures = {
                "base": digest(execute(solution, edge=False)),
                "edge": digest(execute(solution, edge=True)),
            }
            guide = (f"# {qid}: {q['title']}\n\n"
                     f"**Challenge:** {q['prompt']}\n\n"
                     "Submit one read-only SELECT or WITH ... SELECT query "
                     "ending in a semicolon. The grader checks both the base and "
                     "edge-case datasets; column and row order matter.\n")
            challenges.append(put("interview", qid, f"{qid} — {q['title']}",
                                  guide, starter.read_text(encoding="utf-8"),
                                  starter.relative_to(course).as_posix(),
                                  grade=signatures, hint=q["hint"]))
        sections.append({"id": "exercises", "title": "Graded SQL challenges", "items": challenges})

        if level == "advanced":
            schema_challenges = []
            for file in sorted((course / "interview" / "schema" / "starter").glob("C*.sql")):
                task = file.stem
                lines = file.read_text(encoding="utf-8").splitlines()
                title = lines[0].removeprefix("-- ").strip()
                description = lines[1].removeprefix("-- ").strip()
                hint = lines[2].removeprefix("-- Hint: ").strip()
                guide = (f"# {title}\n\n**Schema design:** {description}\n\n"
                         "Create tables and indexes that enforce the business "
                         "rules. The built-in checker tests valid inserts, "
                         "invalid inserts, and required indexes on a fresh "
                         "SQLite database.\n")
                schema_challenges.append(put(
                    "schema", task, title, guide, file.read_text(encoding="utf-8"),
                    file.relative_to(course).as_posix(), schema_task=task, hint=hint))
            sections.append({"id": "exercises", "title": "Schema design challenges",
                             "items": schema_challenges})

        backend = []
        if level == "advanced":
            for sql_file in sorted((course / "backend" / "sql").glob("*.sql")):
                text = sql_file.read_text(encoding="utf-8")
                description = sql_file.stem.replace("_", " ").title()
                guide = (f"# {description}\n\n**Backend engineering recipe.** "
                         "Run the sample against a disposable SQLite database. "
                         "Review the SQL carefully before applying any pattern "
                         "to a production database.\n")
                backend.append(put("backend", sql_file.stem, description, guide,
                                   text, sql_file.relative_to(course).as_posix()))
            for sql_file in sorted((course / "advanced" / "postgresql").glob("*.sql")):
                text = sql_file.read_text(encoding="utf-8")
                description = sql_file.stem.replace("_", " ").title()
                guide = (f"# PostgreSQL: {description}\n\n"
                         "**PostgreSQL 16+ only.** This is a reference lab, not "
                         "runnable with the Lab's in-browser SQLite engine. "
                         "Use a disposable PostgreSQL database and read the "
                         "course repository's PostgreSQL README before running it.\n")
                backend.append(put("postgresql", sql_file.stem, f"PostgreSQL · {description}",
                                   guide, text, sql_file.relative_to(course).as_posix(),
                                   runnable=False, dialect="postgresql"))
            sections.append({"id": "worked_examples",
                             "title": "Backend recipes & PostgreSQL labs", "items": backend})

        projects = []
        for md in sorted((course / level / "projects").glob("*.md")):
            sql_file = md.with_suffix(".sql")
            if not sql_file.exists():
                raise FileNotFoundError(sql_file)
            title = md.read_text(encoding="utf-8").splitlines()[0].removeprefix("# ").strip()
            projects.append(put("projects", md.stem, title,
                                md.read_text(encoding="utf-8"),
                                sql_file.read_text(encoding="utf-8"),
                                sql_file.relative_to(course).as_posix()))
        sections.append({"id": "projects", "title": "Portfolio projects", "items": projects})

        catalog["levels"].append({
            "id": level, "title": label, "medal": medal, "sections": sections,
            "total": len(challenges) + (len(schema_challenges) if level == "advanced" else 0),
        })

    target = out / "data" / "sql"
    nb_dir = target / "nb"
    nb_dir.mkdir(parents=True, exist_ok=True)
    for lesson_id, item in entries.items():
        filename = lesson_id.replace("/", "__") + ".json"
        (nb_dir / filename).write_text(
            json.dumps(item, ensure_ascii=False, indent=1), encoding="utf-8")
    (target / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")

    # Exact snapshots from the original checker, including its changing edge
    # fixture; no duplicated SQL setup or drift between CLI and browser grading.
    fixtures = out / "course" / "sql" / "fixtures"
    fixtures.mkdir(parents=True, exist_ok=True)
    for variant, edge in (("base", False), ("edge", True)):
        with sample_db(edge=edge) as db:
            dump = "\n".join(db.iterdump()) + "\n"
        # Confirm SQLite can restore every fixture that will ship to the browser.
        with sqlite3.connect(":memory:") as restored:
            restored.executescript(dump)
            restored.execute("SELECT 1 FROM customers LIMIT 1").fetchone()
        (fixtures / f"{variant}.sql").write_text(dump, encoding="utf-8")
    # Ship the existing behavioral DDL checker, not the reference solutions.
    tools = out / "course" / "sql" / "tools"
    tools.mkdir(parents=True, exist_ok=True)
    for source in ("tools/run_sql.py", "tools/schema_practice.py",
                   "data/schema.sql", "data/seed.sql"):
        dest = out / "course" / "sql" / source
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes((course / source).read_bytes())
    return catalog
