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
  const box = el("section", { class: "cell code-cell kind-" + cell.kind }, el("div", { class: "gutter" }, runButton, resetButton, badge), el("div", { class: "body" }, editor, output));

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
  if (total) statusEl.dataset.progress = `${count}/${total} done on this page`;
  document.getElementById("page-progress").textContent = total ? `${count} / ${total} checks done` : "";
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
  const cwd = "/course/" + nb.folder;
  container.append(el("div", { class: "nb-head" },
    el("a", { href: `${COURSE_REPO}/blob/main/${nb.id}.ipynb`, target: "_blank", rel: "noopener" }, "View on GitHub"), " · ",
    el("a", { href: `https://colab.research.google.com/github/SwarmLadder/python-notebook/blob/main/${nb.id}.ipynb`, target: "_blank", rel: "noopener" }, "Open in Colab"), " · ",
    el("span", { id: "page-progress" })));
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
  container.setAttribute("aria-busy", "false");
  refreshBadges();

  // previous / next within the same level
  const level = catalog.levels.find((l) => nbId.startsWith(l.id + "/"));
  const flat = level.sections.flatMap((s) => s.items);
  const at = flat.findIndex((i) => i.id === nbId);
  const pager = document.getElementById("pager");
  if (at > 0) pager.append(el("a", { href: "lesson.html?nb=" + flat[at - 1].id }, "← " + flat[at - 1].title));
  pager.append(el("a", { href: "index.html" }, "Dashboard"));
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
  document.getElementById("notebook").append(el("p", { class: "error" }, String(error)));
});
