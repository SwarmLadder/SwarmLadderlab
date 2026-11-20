"""Static UI contract checks. Browser e2e covers actual interactions."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


def read(path):
    return (SITE / path).read_text(encoding="utf-8")


def test_accessible_shared_navigation():
    for page in ("index.html", "lesson.html", "claim.html"):
        html = read(page)
        assert 'class="skip-link"' in html
        assert 'id="theme-toggle"' in html
        assert 'src="assets/theme.js"' in html
        assert 'name="viewport"' in html


def test_search_filters_and_progress_controls():
    html = read("index.html")
    for identifier in ('id="continue"', 'id="levels"', 'id="search"',
                       'id="filter-group"', 'id="export"', 'id="import"', 'id="reset"'):
        assert identifier in html, identifier
    script = read("assets/home.js")
    for feature in ("renderCatalog", "levelStats", "progress.doneIn", "aria-pressed"):
        assert feature in script, feature


def test_existing_notebook_runtime_is_preserved():
    html = read("lesson.html")
    for identifier in ('id="notebook"', 'id="run-all"', 'id="stop"',
                       'id="restart"', 'id="pager"'):
        assert identifier in html, identifier
    script = read("assets/notebook.js")
    for feature in ("PythonRunner", "graduatedKeys", "progress.markDone",
                    'class: "cell-toolbar"', 'class: "output"', 'class: "run"'):
        assert feature in script, feature


def test_responsive_and_dark_mode_styles_exist():
    css = read("assets/style.css")
    for feature in ("max-width:760px", "max-width:460px", "prefers-reduced-motion",
                    ".lesson-sidebar", ".upcoming-grid", '[data-theme="dark"]'):
        assert feature in css, feature
