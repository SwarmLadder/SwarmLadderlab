import { COURSE_REPO, el, loadCatalog, loadNotebook, progress } from "./app.js";

const loginInput = document.getElementById("login");
loginInput.value = localStorage.getItem("swarmladderlab.login") || "";

// Rebuild practice/exercises/<module>.py from the code the learner wrote in a workbook.
async function moduleSource(workbookId, module) {
  const nb = await loadNotebook(workbookId);
  const parts = [`# My solutions for ${module}, written on SwarmLadderlab.`, ""];
  for (const cell of nb.cells) {
    if (cell.type !== "code" || cell.kind === "check") continue;
    let source = progress.savedCode(workbookId, cell.id) ?? cell.source;
    if (cell.kind === "setup") {
      source = source.split("\n").filter((line) => !line.startsWith("from check import") && !line.startsWith("check = Checker(")).join("\n").trim();
    }
    if (source) parts.push(source, "");
  }
  return parts.join("\n").replace(/\n{3,}/g, "\n\n");
}

function download(name, text) {
  const link = el("a", { href: URL.createObjectURL(new Blob([text], { type: "text/x-python" })), download: name });
  link.click(); URL.revokeObjectURL(link.href);
}

async function main() {
  const catalog = await loadCatalog();
  const container = document.getElementById("claims");
  for (const level of catalog.levels) {
    const workbooks = Object.entries(catalog.workbooks).filter(([, w]) => w.level === level.id);
    const status = workbooks.map(([id, w]) => {
      const done = new Set(progress.doneIn(id));
      const missing = w.exercises.filter((name) => !done.has("wb:" + name));
      return { id, ...w, missing };
    });
    const complete = status.every((w) => w.missing.length === 0);
    const card = el("article", { class: "level" }, el("h2", {}, `${level.medal} ${level.title} ${complete ? "— complete!" : ""}`));
    const list = el("ul", { class: "items" });
    for (const w of status) {
      const title = level.sections.flatMap((s) => s.items).find((i) => i.id === w.id)?.title || w.module;
      list.append(el("li", {}, w.missing.length ? "⬜ " : "✅ ", el("a", { href: "lesson.html?nb=" + w.id }, title), " ",
        el("small", {}, w.missing.length ? `${w.exercises.length - w.missing.length}/${w.exercises.length} — next: ${w.missing[0]}` : "all checks passed")));
    }
    card.append(list);
    if (complete) {
      const steps = el("ol", { class: "steps" },
        el("li", {}, el("a", { href: COURSE_REPO + "/fork", target: "_blank", rel: "noopener" }, "Fork the course on GitHub"), " (once)."),
        el("li", {}, "Download your solutions and upload them to ", el("code", {}, "practice/exercises/"), " in your fork (replace the files): ",
          ...status.map((w) => el("button", { onclick: async () => download(w.module + ".py", await moduleSource(w.id, w.module)) }, w.module + ".py"))),
        el("li", {}, el("button", { onclick: () => {
          const login = loginInput.value.trim();
          if (!/^[A-Za-z0-9-]{1,39}$/.test(login)) { alert("Enter your GitHub login first."); return; }
          localStorage.setItem("swarmladderlab.login", login);
          const text = `level: ${level.id}\nname: ${login}\n`;
          const url = `https://github.com/${login}/python-notebook/new/main?filename=${encodeURIComponent(`achievements/claims/${login}.md`)}&value=${encodeURIComponent(text)}`;
          window.open(url, "_blank", "noopener");
        } }, "Create your claim file"), " in your fork, then open a pull request to SwarmLadder/python-notebook."),
        el("li", {}, "The ", el("em", {}, "Verify achievement"), " check runs your code; a maintainer then approves and your name is added."));
      card.append(steps);
    } else {
      card.append(el("p", {}, "Finish every workbook of this level to unlock your claim."));
    }
    container.append(card);
  }
}
main();
