"""Prepare only the generated directories inside public/ for Next.js."""
import argparse
import shutil
import tempfile
from pathlib import Path

from build_site import build, HERE

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--course", type=Path, default=Path("../python-notebook"))
    args = parser.parse_args()
    public = HERE.parent / "public"
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "curriculum"
        catalog = build(args.course.resolve(), out)
        for name in ("data", "course"):
            shutil.rmtree(public / name, ignore_errors=True)
            shutil.copytree(out / name, public / name)
    print("Prepared", sum(len(s["items"]) for level in catalog["levels"] for s in level["sections"]), "notebooks")

if __name__ == "__main__":
    main()
