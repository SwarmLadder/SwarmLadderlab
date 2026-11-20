"""Prepare Python + SQL course assets in public/ for Next.js and Pyodide."""
import argparse
import json
import shutil
import tempfile
from pathlib import Path

from build_site import build, HERE
from build_sql import build_sql


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--course", type=Path, default=Path("../python-notebook"))
    parser.add_argument("--sql-course", type=Path, default=Path("../SQL"))
    args = parser.parse_args()
    public = HERE.parent / "public"
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "curriculum"
        python_catalog = build(args.course.resolve(), out)
        sql_catalog = build_sql(args.sql_course.resolve(), out)

        # The existing Pyodide worker fetches this manifest once per session.
        # SQL fixtures are intentionally namespaced so Python file paths remain stable.
        manifest = out / "data" / "course-files.json"
        files = json.loads(manifest.read_text(encoding="utf-8"))
        files.extend(["sql/fixtures/base.sql", "sql/fixtures/edge.sql"])
        manifest.write_text(json.dumps(sorted(set(files)), indent=1), encoding="utf-8")

        for name in ("data", "course"):
            shutil.rmtree(public / name, ignore_errors=True)
            shutil.copytree(out / name, public / name)

    count = lambda c: sum(len(s["items"]) for l in c["levels"] for s in l["sections"])
    print(f"Prepared {count(python_catalog)} Python notebooks, {count(sql_catalog)} SQL activities")


if __name__ == "__main__":
    main()
