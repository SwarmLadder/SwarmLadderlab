
import { el, levelStats, loadCatalog, progress } from "./app.js";

const levelInfo = {
  basics: ["01 / FOUNDATION", "⌘", "Learn the essentials. Write your first Python programs with confidence."],
  intermediate: ["02 / BUILD SKILLS", "◇", "Go beyond the fundamentals with deeper concepts and practical work."],
  advanced: ["03 / GO DEEPER", "✳", "Tackle advanced techniques and build real problem-solving fluency."]
};
const sectionIcons = { notebooks: "▤", exercises: "✎", worked_examples: "⌘", projects: "▣" };
let catalog = null;
let query = "";
let filter = "all";

function linkFor(id) { return "lesson.html?nb=" + encodeURIComponent(id); }

function progressBar(completed, total) {
  const percent = total ? Math.min(100, Math.round(100 * completed / total)) : 0;
  return el("div", { class: "bar", role: "progressbar", "aria-valuenow": String(percent),
    "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": completed + " of " + total + " checks completed" },
    el("span", { style: "width:" + percent + "%" }),
    el("em", {}, completed + " / " + total + " (" + percent + "%)"));
}

function buildLevel(level, groups) {
  const stats = levelStats(catalog, level);
  const meta = levelInfo[level.id] || [level.title, "◆", "Learn with practical, interactive notebooks."];
  const notebookCount = level.sections.reduce((n, s) => n + s.items.length, 0);
  const card = el("article", { class: "level level-" + level.id },
    el("div", { class: "level-top" },
      el("div", { class: "level-eyebrow" }, el("span", {}, meta[0]),
        el("span", { class: "level-number" }, notebookCount + " notebooks")),
      el("h2", {}, el("span", { class: "level-icon", "aria-hidden": "true" }, meta[1]), level.title),
      el("p", { class: "level-description" }, meta[2]), progressBar(stats.completed, stats.total)));
  const sections = el("div", { class: "level-sections" });
  for (const section of groups) {
    const details = el("details", {});
    details.open = Boolean(query || filter !== "all" || section.id === "notebooks");
    details.append(el("summary", {},
      el("span", { class: "section-icon", "aria-hidden": "true" }, sectionIcons[section.id] || "▤"),
      section.title, el("span", { class: "section-count" }, String(section.items.length))));
    const list = el("ol", { class: "items" });
    section.items.forEach((item, index) => {
      const completed = Math.min(progress.doneIn(item.id).length, item.graded);
      const complete = item.graded > 0 && completed >= item.graded;
      const name = el("span", { class: "item-name" }, item.title,
        el("span", { class: "item-subtitle" },
          item.graded ? completed + " of " + item.graded + " checks" : "Interactive notebook"));
      list.append(el("li", {}, el("a", { class: "item-link", href: linkFor(item.id) },
        el("span", { class: "item-number", "aria-hidden": "true" }, String(index + 1).padStart(2, "0")),
        name, complete ? el("span", { class: "item-check", title: "Completed" }, "✓ Done") :
          el("span", { class: "item-arrow", "aria-hidden": "true" }, "↗"))));
    });
    details.append(list);
    sections.append(details);
  }
  card.append(sections);
  return card;
}

function renderCatalog() {
  const container = document.getElementById("levels");
  container.replaceChildren();
  let count = 0, matchingLevels = 0;
  for (const level of catalog.levels) {
    const groups = level.sections.filter((s) => filter === "all" || s.id === filter)
      .map((s) => ({ ...s, items: s.items.filter((item) =>
        (item.title + " " + item.id).toLowerCase().includes(query)) }))
      .filter((s) => s.items.length);
    if (!groups.length) continue;
    count += groups.reduce((n, s) => n + s.items.length, 0);
    matchingLevels++;
    container.append(buildLevel(level, groups));
  }
  if (!count) container.append(el("div", { class: "empty-state" },
    el("h3", {}, "No notebooks found"), el("p", {}, "Try another keyword or content filter.")));
  document.getElementById("results-meta").textContent =
    count + " notebook" + (count === 1 ? "" : "s") + " across " +
    matchingLevels + " level" + (matchingLevels === 1 ? "" : "s");
  container.setAttribute("aria-busy", "false");
}

function renderOverview() {
  const state = progress.all();
  const items = catalog.levels.flatMap((level) => level.sections.flatMap((section) => section.items));
  const titles = new Map(items.map((item) => [item.id, item.title]));
  const defaultItem = items.find((item) => item.id.startsWith("basics/notebooks/")) || items[0];
  const last = state.last && titles.has(state.last) ? state.last : null;
  const id = last || (defaultItem && defaultItem.id);
  if (id) {
    const continueLink = el("a", { class: "cta", href: linkFor(id),
      title: last ? "Continue: " + titles.get(last) : "Start with Python foundations" },
      last ? "▶ Continue learning" : "▶ Start learning", el("span", { "aria-hidden": "true" }, "↗"));
    document.getElementById("continue").replaceChildren(continueLink);
  }
  const total = catalog.levels.reduce((sum, level) => sum + level.total, 0);
  const completed = catalog.levels.reduce((sum, level) => sum + levelStats(catalog, level).completed, 0);
  const percent = total ? Math.min(100, Math.round(100 * completed / total)) : 0;
  document.getElementById("dashboard-progress").replaceChildren(
    el("div", { class: "progress-topline" }, el("span", { class: "progress-caption" }, "YOUR LEARNING PROGRESS"),
      el("span", { class: "progress-percent" }, percent + "%")),
    el("div", { class: "progress-main" }, completed.toLocaleString() + " ",
      el("small", {}, "/ " + total.toLocaleString() + " checks completed")),
    el("div", { class: "overview-progressbar", role: "progressbar", "aria-label": "Overall learning progress",
      "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(percent) },
      el("span", { style: "width:" + percent + "%" })),
    el("div", { class: "progress-subtext" },
      el("span", {}, last ? "Welcome back. Your next challenge is ready." : "Every journey starts with a single step."),
      el("span", {}, catalog.levels.length + " learning levels")));
  document.getElementById("dashboard-lessons").replaceChildren(
    el("span", { class: "stat-label" }, "AVAILABLE NOTEBOOKS"),
    el("span", { class: "stat-number" }, items.length.toLocaleString()),
    el("span", { class: "stat-note" }, "Guided, hands-on content"));
  document.getElementById("dashboard-tracks").replaceChildren(
    el("span", { class: "stat-label" }, "LEARNING LEVELS"),
    el("span", { class: "stat-number" }, String(catalog.levels.length).padStart(2, "0")),
    el("span", { class: "stat-note" }, "From basics to advanced"));
}

async function main() {
  try {
    catalog = await loadCatalog();
    renderOverview();
    renderCatalog();
    document.getElementById("search").addEventListener("input", (event) => {
      query = event.target.value.trim().toLowerCase();
      renderCatalog();
    });
    document.getElementById("filter-group").addEventListener("click", (event) => {
      const target = event.target.closest("button[data-filter]");
      if (!target) return;
      filter = target.dataset.filter;
      for (const button of document.querySelectorAll(".filter-button")) {
        const selected = button === target;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      }
      renderCatalog();
    });
  } catch (error) {
    document.getElementById("levels").replaceChildren(el("div", { class: "empty-state" },
      el("h3", {}, "The curriculum couldn't be loaded."),
      el("p", {}, "Check your connection and refresh the page.")));
    document.getElementById("levels").setAttribute("aria-busy", "false");
    document.getElementById("results-meta").textContent = "Curriculum unavailable";
    console.error(error);
  }
}

document.getElementById("export").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([progress.export()], { type: "application/json" }));
  const link = el("a", { href: url, download: "swarmladderlab-progress.json" });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.getElementById("import").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try { progress.import(await file.text()); location.reload(); }
  catch (error) { alert(error.message); }
});
document.querySelector(".import-button").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    document.getElementById("import").click();
  }
});
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Delete all progress and saved code in this browser? Export a backup first if needed.")) {
    progress.reset();
    location.reload();
  }
});
main();
