import { COURSE_REPO, PythonRunner, el, graduatedKeys, loadCatalog, loadNotebook, progress } from "./app.js";

const params = new URLSearchParams(location.search);
const nbId = params.get("nb") || "basics/notebooks/00_python_introduction";
const statusEl = document.getElementById("status");
const runner = new PythonRunner((text) => { statusEl.textContent = text; });
const cells = [];  // {cell, editor, output, run()}

function autosize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + 2 + "px";
}

function codeCell(cell, cwd) {
  const original = cell.source;
  const editor = el("textarea", { class: "code", spellcheck: "false", "aria-label": "Python code", wrap: "off" });
  editor.value = progress.savedCode(nbId, cell.id) ?? original;
  const output = el("pre", { class: "output", "aria-live": "polite" });
  const runButton = el("button", { class: "run", title: "Run (Shift+Enter)" }, "▶");
  const resetButton = el("button", { class: "reset", title: "Put back the original code" }, "↺");
  const badge = el("span", { class: "badge" });
  const typeLabel = ({exercise:"EXERCISE", check:"RUN CHECK", quiz:"KNOWLEDGE CHECK", setup:"SETUP", code:"PYTHON"})[cell.kind] || "PYTHON";
  runButton.textContent = "▶ Run";
  resetButton.textContent = "↺ Reset";
  const box = el("section", { class: "cell code-cell kind-" + cell.kind },
    el("div", { class: "body" },
      el("div", { class: "cell-toolbar" },
        el("span", { class: "cell-type" }, el("span", { class: "cell-dot", "aria-hidden": "true" }), typeLabel),
        el("div", { class: "cell-buttons" }, badge, resetButton, runButton)),
      editor, el("div", { class: "output-wrap" },
        el("div", { class: "output-header" }, "OUTPUT"), output)));

  async function run() {
    output.textContent = "";
    output.className = "output running";
    box.classList.add("busy");
    let text = "";
    const result = await runner.run(editor.value, cwd, (name, chunk) => {
      text += chunk;
      output.append(name === "stderr" ? el("span", { class: "stderr" }, chunk) : chunk);
    });
    box.classList.remove("busy");
    output.className = "output";
    if (result.error) {
      output.append(el("span", { class: result.friendly ? "friendly" : "error" }, result.friendly ? result.friendly + "\n" : ""));
      if (!result.friendly || !/___/.test(editor.value)) output.append(el("span", { class: "error" }, result.error));
    }
    const newly = graduatedKeys(text).filter((key) => progress.markDone(nbId, key));
    if (newly.length) refreshBadges();
    return result;
  }

  runButton.addEventListener("click", run);
  resetButton.addEventListener("click", () => {
    if (editor.value !== original && !confirm("Replace your code in this cell with the original?")) return;
    editor.value = original; progress.forgetCode(nbId, cell.id); autosize(editor);
  });
  editor.addEventListener("input", () => { autosize(editor); progress.saveCode(nbId, cell.id, editor.value); });
  editor.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.shiftKey) { event.preventDefault(); run(); }
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      const { selectionStart: s, selectionEnd: e } = editor;
      editor.setRangeText("    ", s, e, "end");
      editor.dispatchEvent(new Event("input"));
    }
  });
  requestAnimationFrame(() => autosize(editor));
  const entry = { cell, editor, output, run, badge };
  cells.push(entry);
  return box;
}

function refreshBadges() {
  const done = new Set(progress.doneIn(nbId));
  for (const entry of cells) {
    const keys = entry.keys || [];
    const complete = keys.length && keys.every((k) => done.has(k));
    entry.badge.textContent = complete ? "✅" : "";
    entry.badge.title = complete ? "Done" : "";
  }
  const total = (window.__graded || []).length;
  const count = (window.__graded || []).filter((k) => done.has(k)).length;
  if (total) statusEl.dataset.progress = count + "/" + total + " done on this page";
  const progressLabel = total ? count + " / " + total + " checks done" : "Practice notebook";
  document.getElementById("page-progress").textContent = progressLabel;
  document.getElementById("sidebar-progress").textContent = total ? Math.round((count / total) * 100) + "%" : "—";
  document.getElementById("sidebar-progress-fill").style.width = total ? (100 * count / total) + "%" : "0%";
}

function keysForCell(cell) {
  const source = cell.source;
  let m;
  if (cell.kind === "exercise" && (m = source.match(/check\((\d+),/))) return ["ex" + m[1]];
  if (cell.kind === "quiz") return [...source.matchAll(/quiz\.answer\((\d+),/g)].map((x) => "q" + x[1]);
  if (cell.kind === "check" && (m = source.match(/check\('([^']+)'\)/))) return ["wb:" + m[1]];
  return [];
}

async function main() {
  const [nb, catalog] = await Promise.all([loadNotebook(nbId), loadCatalog()]);
  progress.setLast(nbId);
  document.title = nb.title + " · SwarmLadderlab";
  window.__graded = nb.graded;
  const container = document.getElementById("notebook");
  container.replaceChildren();
  const level = catalog.levels.find((entry) => nbId.startsWith(entry.id + "/"));
  const section = level && level.sections.find((entry) => entry.items.some((item) => item.id === nbId));
  document.getElementById("sidebar-course-name").textContent = level ? level.title + " Python" : "Python";
  document.getElementById("sidebar-level").textContent = section ? section.title : "Interactive notebook";
  const cwd = "/course/" + nb.folder;
  container.append(el("div", { class: "nb-head" },
    el("div", { class: "breadcrumb" },
      el("a", { href: "index.html#catalog" }, "Python"),
      el("span", { class: "crumb-arrow", "aria-hidden": "true" }, " / "),
      level ? level.title : "Course",
      el("span", { class: "crumb-arrow", "aria-hidden": "true" }, " / "),
      section ? section.title : "Notebook"),
    el("div", { class: "nb-links" },
      el("span", { id: "page-progress", class: "nb-progress" }),
      el("a", { href: COURSE_REPO + "/blob/main/" + nb.id + ".ipynb",
        target: "_blank", rel: "noopener noreferrer" }, "GitHub ↗"),
      el("a", { href: "https://colab.research.google.com/github/SwarmLadder/python-notebook/blob/main/" + nb.id + ".ipynb",
        target: "_blank", rel: "noopener noreferrer" }, "Colab ↗"))));
  for (const cell of nb.cells) {
    if (cell.type === "md") {
      const div = el("section", { class: "cell md" });
      div.innerHTML = cell.html;  // rendered at build time from the course's own Markdown
      container.append(div);
    } else {
      container.append(codeCell(cell, cwd));
      cells[cells.length - 1].keys = keysForCell(cell);
    }
  }
  const outline = document.getElementById("lesson-outline");
  const headings = [...container.querySelectorAll(".cell.md h2, .cell.md h3")].slice(0, 25);
  headings.forEach((heading, i) => {
    const id = heading.id || "lesson-section-" + i;
    if (!heading.id) heading.id = id;
    outline.append(el("a", { href: "#" + id,
      class: heading.tagName === "H3" ? "toc-sub" : "" }, heading.textContent.trim()));
  });
  if (!headings.length) outline.append(el("span", { class: "sidebar-level" }, "Follow the lesson below."));
  if (headings.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((events) => {
      for (const item of events) {
        if (item.isIntersecting) {
          for (const a of outline.querySelectorAll("a")) a.classList.toggle("toc-active", a.hash === "#" + item.target.id);
        }
      }
    }, { rootMargin: "-100px 0px -68% 0px" });
    headings.forEach((heading) => observer.observe(heading));
  }
  container.setAttribute("aria-busy", "false");
  refreshBadges();

  // previous / next within the same level
  const flat = level ? level.sections.flatMap((s) => s.items) : [];
  const at = flat.findIndex((i) => i.id === nbId);
  const pager = document.getElementById("pager");
  if (at > 0) pager.append(el("a", { href: "lesson.html?nb=" + flat[at - 1].id }, "← " + flat[at - 1].title));
  pager.append(el("a", { class: "pager-center", href: "index.html#catalog" }, "All lessons"));
  if (at >= 0 && at < flat.length - 1) pager.append(el("a", { href: "lesson.html?nb=" + flat[at + 1].id }, flat[at + 1].title + " →"));
}

document.getElementById("run-all").addEventListener("click", async () => {
  for (const entry of cells) {
    const result = await entry.run();
    if (result.stopped) break;
  }
});
document.getElementById("stop").addEventListener("click", () => runner.restart());
document.getElementById("restart").addEventListener("click", () => {
  runner.restart();
  for (const entry of cells) entry.output.textContent = "";
});

main().catch((error) => {
  const target = document.getElementById("notebook");
  target.setAttribute("aria-busy", "false");
  target.replaceChildren(el("p", { class: "error" }, "Unable to load this lesson. Return to the curriculum and try again."));
  console.error(error);
});
