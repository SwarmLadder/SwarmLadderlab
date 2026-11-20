# SwarmLadder Lab

**Learn by building.** A free, interactive learning platform from [SwarmLadder](https://github.com/SwarmLadder).

**Website:** https://swarmladder.github.io/SwarmLadderlab/

Python is available now. Lessons, workbooks, quizzes, and projects run in the browser; future course tracks will be integrated into the platform over time.

## Learning experience

- Explore the Python curriculum with **search, category filters, and structured levels**.
- Learn in a focused notebook workspace with a lesson outline, responsive code editors, and in-browser execution through Pyodide.
- Use **Shift+Enter** or the Run button. Stop and restart the Python environment without losing saved edits.
- Follow progress for each level and resume the last lesson. Edits and progress stay in this browser and can be exported/imported.
- Earn verified achievements after finishing workbook checks and submitting a claim to the Python course.
- Enjoy a mobile-friendly interface with **light and dark themes**, keyboard navigation, and accessible controls.

New courses (SQL, Git, Linux, DSA and Rust) are not yet playable through the Lab; previews are clearly marked as coming soon.
## How it works

```
python-notebook (course)  ──build/build_site.py──▶  dist/  ──GitHub Pages──▶  learners
  *.ipynb, lesson.py,                                index.html, lesson.html, claim.html
  quiz.py, practice/                                 data/nb/*.json  (rendered notebooks)
                                                     course/...      (files Python needs)
```

- **No server.** It's a static site; Python runs in a Web Worker (`site/assets/py-worker.js`), so it's free to host and scales to any number of learners.
- **Same course, same checks.** The build reads the course repo directly. Notebooks become JSON with Markdown rendered at build time. `lesson.py`, `quiz.py`, `practice/` and the data files are copied into Pyodide's file system, so checks behave exactly as in Jupyter.
- **Browser limits.** Browsers can't start threads or processes, so the few cells that need them say so and link to Colab or Jupyter. `asyncio`, SQLite, files and pytest all work.

## Develop

```bash
git clone https://github.com/SwarmLadder/python-notebook ../python-notebook
python -m pip install markdown pytest
python build/build_site.py --course ../python-notebook --out dist
python -m http.server -d dist 8000      # open http://localhost:8000
```

Tests:

```bash
python -m pytest tests                  # build checks
node tests/e2e.cjs                      # end-to-end in headless Chromium (needs Playwright and network)
BASE_URL=https://swarmladder.github.io/SwarmLadderlab/ node tests/e2e.cjs   # same checks on the live site
```

## Deploy

`.github/workflows/deploy.yml` builds from the latest course on every push to `main`, every day, and on demand, then publishes to GitHub Pages.
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Keep `deploy.yml` as the only Pages workflow: GitHub's suggested "static" or "Jekyll" workflows would publish the raw repository instead of the built site.

## License

Code: [MIT](LICENSE). Course content comes from python-notebook under CC BY 4.0.
