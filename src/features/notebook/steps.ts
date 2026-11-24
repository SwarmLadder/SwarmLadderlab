// Splits a notebook into steps a learner can take one at a time.
import type { CodeCell, Notebook } from "../../lib/course";
export type MdCell = { type: "md"; html: string };
export type Cell = CodeCell | MdCell;
export type Step = { title: string; part?: string; cells: Cell[]; keys: string[]; quiz?: QuizData };
export type QuizOption = { letter: string; html: string };
export type QuizQuestion = { number: number; html: string; options: QuizOption[] };
export type QuizData = { id: string; hashes: Record<number, string>; questions: QuizQuestion[] };

const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const startsWithHeading = (html: string) => /^\s*<h[23][\s>]/.test(html);
const isExercisePrompt = (html: string) => /^\s*<p><strong>Exercise \d+\.<\/strong>/.test(html);
const isNextLink = (html: string) => /^\s*<p><strong>Next:<\/strong>/.test(html);

export function keysFor(c: CodeCell): string[] {
  if (c.assessment) return [c.assessment];
  if (c.kind === "quiz") return Array.from(c.source.matchAll(/quiz\.answer\((\d+),/g), (m) => "q" + m[1]);
  const m = c.kind === "exercise" ? c.source.match(/check\((\d+),/) : c.kind === "check" ? c.source.match(/check\('([^']+)'\)/) : null;
  return m ? [(c.kind === "exercise" ? "ex" : "wb:") + m[1]] : [];
}

function parseQuiz(md: MdCell, code: CodeCell): QuizData | undefined {
  const head = code.source.match(/Quiz\('([^']+)',\s*(\{[^}]*\})\)/);
  if (!head || typeof DOMParser === "undefined") return;
  const hashes: Record<number, string> = {};
  for (const m of head[2].matchAll(/(\d+):\s*'([0-9a-f]+)'/g)) hashes[Number(m[1])] = m[2];
  const doc = new DOMParser().parseFromString(md.html, "text/html");
  const questions: QuizQuestion[] = [];
  let currentQ: QuizQuestion | null = null;
  for (const node of Array.from(doc.body.children)) {
    const lead = node.querySelector(":scope > strong:first-child");
    const num = node.tagName === "P" && lead ? lead.textContent?.match(/^(\d+)\.$/) : null;
    if (num) {
      lead!.remove();
      currentQ = { number: Number(num[1]), html: node.innerHTML.trim(), options: [] };
      questions.push(currentQ);
    } else if (currentQ && (node.tagName === "UL" || node.tagName === "OL")) {
      for (const li of Array.from(node.querySelectorAll(":scope > li"))) {
        const tag = li.querySelector("strong");
        const letter = tag?.textContent?.match(/^([a-d])\)$/)?.[1];
        if (!letter) continue;
        tag!.remove();
        currentQ.options.push({ letter, html: li.innerHTML.trim() });
      }
    } else if (currentQ && node.tagName === "P" && currentQ.options.length === 0) {
      currentQ.html += " " + node.innerHTML; // multi-line question (e.g. code)
    }
  }
  return questions.length ? { id: head[1], hashes, questions } : undefined;
}

export function buildSteps(nb: Notebook): Step[] {
  const steps: Step[] = [];
  let step: Step = { title: "", cells: [], keys: [] };
  let pendingPart: string | undefined;
  const push = () => {
    if (!step.cells.length) return;
    step.cells = step.cells.filter((c, i) => c.type !== "md" || c.html.trim() || step.cells.length === 1 || i > 0);
    const onlyHeading = step.cells.length === 1 && step.cells[0].type === "md" && !(step.cells[0] as MdCell).html.trim();
    if (onlyHeading && steps.length) {
      pendingPart = step.title; // e.g. "Exercises": becomes a label on the next step
      return;
    }
    if (pendingPart) {
      step.part = pendingPart;
      pendingPart = undefined;
    }
    steps.push(step);
  };
  nb.cells.forEach((cell, i) => {
    if (cell.type === "md") {
      if (isNextLink(cell.html)) return; // the lesson's own "next" card replaces this
      let html = cell.html;
      if (i === 0) html = html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/, ""); // the page header shows the title
      if (startsWithHeading(html) || isExercisePrompt(html)) {
        push();
        const heading = html.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/)?.[1];
        const prompt = html.match(/<strong>(Exercise \d+)\.<\/strong>/)?.[1];
        step = { title: strip(isExercisePrompt(html) ? prompt! : heading ?? ""), cells: [], keys: [] };
        // The step header shows the title, so drop it from the text below.
        html = isExercisePrompt(html)
          ? html.replace(/<strong>Exercise \d+\.<\/strong>\s*/, "")
          : html.replace(/^\s*<h[23][^>]*>[\s\S]*?<\/h[23]>\s*/, "");
        if (!html.trim()) {
          step.cells.push({ type: "md", html: "" });
          return;
        }
      }
      if (html.trim()) step.cells.push({ type: "md", html });
      return;
    } else {
      const prev = step.cells[step.cells.length - 1];
      if (cell.kind === "quiz" && prev?.type === "md") {
        const quiz = parseQuiz(prev, cell);
        if (quiz) {
          step.quiz = quiz;
          step.cells.pop();
          step.keys.push(...quiz.questions.map((q) => "q" + q.number));
          step.cells.push(cell); // kept (hidden) so "Run all" still works the old way
          return;
        }
      }
      step.keys.push(...keysFor(cell));
      step.cells.push(cell);
    }
  });
  push();
  if (steps[0] && !steps[0].title) steps[0].title = "Overview";
  return steps;
}

// Each course hashes quiz answers with its own prefix (see its quiz.py).
export async function quizFingerprint(id: string, n: number, letter: string, course = "python") {
  const prefix = course === "dsa" ? "dsa-course-quiz" : "python-notebook-quiz";
  const data = new TextEncoder().encode(`${prefix}|${id}|${n}|${letter}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}
