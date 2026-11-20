import { el, levelStats, loadCatalog, progress } from "./app.js";

function bar(completed, total) {
  const percent = total ? Math.round((100 * completed) / total) : 0;
  return el("div", { class: "bar", role: "progressbar", "aria-valuenow": percent, "aria-valuemin": 0, "aria-valuemax": 100 },
    el("span", { style: `width:${percent}%` }), el("em", {}, `${completed} / ${total} (${percent}%)`));
}

async function main() {
  const catalog = await loadCatalog();
  const state = progress.all();
  const titles = {};
  for (const level of catalog.levels) for (const s of level.sections) for (const i of s.items) titles[i.id] = i.title;
  const cont = document.getElementById("continue");
  const first = "basics/notebooks/00_python_introduction";
  const last = state.last && titles[state.last] ? state.last : null;
  cont.append(el("a", { class: "cta", href: "lesson.html?nb=" + (last || first) },
    last ? "▶ Continue: " + titles[last] : "▶ Start the first lesson"));

  const container = document.getElementById("levels");
  for (const level of catalog.levels) {
    const stats = levelStats(catalog, level);
    const card = el("article", { class: "level" }, el("h2", {}, `${level.medal} ${level.title}`), bar(stats.completed, stats.total));
    for (const section of level.sections) {
      const list = el("ol", { class: "items" });
      for (const item of section.items) {
        const doneHere = progress.doneIn(item.id).length;
        const mark = item.graded ? (doneHere >= item.graded ? "✅" : doneHere ? `${doneHere}/${item.graded}` : "") : "";
        list.append(el("li", {}, el("a", { href: "lesson.html?nb=" + item.id }, item.title), " ", el("small", {}, mark)));
      }
      card.append(el("details", { open: section.id === "notebooks" ? "" : null }, el("summary", {}, `${section.title} (${section.items.length})`), list));
    }
    container.append(card);
  }
  container.setAttribute("aria-busy", "false");
}

document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([progress.export()], { type: "application/json" });
  const link = el("a", { href: URL.createObjectURL(blob), download: "swarmladderlab-progress.json" });
  link.click(); URL.revokeObjectURL(link.href);
});
document.getElementById("import").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try { progress.import(await file.text()); location.reload(); }
  catch (error) { alert(error.message); }
});
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Delete all progress and saved code in this browser? Export first if you want a backup.")) { progress.reset(); location.reload(); }
});

main();
