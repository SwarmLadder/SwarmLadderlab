"""Prepare all SwarmLadder curricula as independent static catalogs."""
import argparse
import json
import shutil
import tempfile
from pathlib import Path

from build_site import build, HERE
from build_sql import build_sql
from build_git_rust import build_git, build_rust
from build_linux import build_linux
from build_dsa_c import build_dsa, build_c
from build_java import build_java


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--course", type=Path, default=Path("../python-notebook"))
    parser.add_argument("--sql-course", type=Path, default=Path("../SQL"))
    parser.add_argument("--git-course", type=Path, default=Path("../git-github-course"))
    parser.add_argument("--rust-course", type=Path, default=Path("../RUST"))
    parser.add_argument("--linux-course", type=Path, default=Path("../linux-course"))
    parser.add_argument("--dsa-course", type=Path, default=Path("../Data-Structures-Algorithms"))
    parser.add_argument("--c-course", type=Path, default=Path("../C"))
    parser.add_argument("--java-course", type=Path, default=Path("../Java"))
    args = parser.parse_args()
    public = HERE.parent / "public"
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "curriculum"
        python_catalog = build(args.course.resolve(), out)
        sql_catalog = build_sql(args.sql_course.resolve(), out)
        git_catalog = build_git(args.git_course.resolve(), out)
        rust_catalog = build_rust(args.rust_course.resolve(), out)
        linux_catalog = build_linux(args.linux_course.resolve(), out)
        dsa_catalog = build_dsa(args.dsa_course.resolve(), out)
        c_catalog = build_c(args.c_course.resolve(), out)
        java_catalog = build_java(args.java_course.resolve(), out)

        # The existing Pyodide worker fetches this manifest once per session.
        # SQL fixtures are intentionally namespaced so Python file paths remain stable.
        manifest = out / "data" / "course-files.json"
        files = json.loads(manifest.read_text(encoding="utf-8"))
        files.extend(["sql/fixtures/base.sql", "sql/fixtures/edge.sql",
                      "sql/tools/run_sql.py", "sql/tools/schema_practice.py",
                      "sql/data/schema.sql", "sql/data/seed.sql"])
        manifest.write_text(json.dumps(sorted(set(files)), indent=1), encoding="utf-8")

        for name in ("data", "course"):
            shutil.rmtree(public / name, ignore_errors=True)
            shutil.copytree(out / name, public / name)

    count = lambda c: sum(len(s["items"]) for l in c["levels"] for s in l["sections"])
    print(f"Prepared {count(python_catalog)} Python notebooks, {count(sql_catalog)} SQL activities, "
          f"{count(git_catalog)} Git activities, {count(rust_catalog)} Rust activities, "
          f"{count(linux_catalog)} Linux activities, {count(dsa_catalog)} DSA activities "
          f"{count(c_catalog)} C activities and {count(java_catalog)} Java activities")


if __name__ == "__main__":
    main()
