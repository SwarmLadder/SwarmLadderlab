// Where each course's work runs and how it is checked: a short label, details on demand.
export const RUNTIME: Record<string, [string, string]> = {
  python: ["Runs in your browser", "Lessons run Python in your browser, and checks grade your current code."],
  sql: ["Runs in your browser", "Queries run on SQLite in your browser against sample datasets. PostgreSQL labs are read-only references."],
  dsa: ["Runs in your browser", "Lessons, drills, interview problems and projects run Python in your browser. Checks use each task's published cases and test suites, and grade your current code."],
  git: ["Local labs · self-reported", "Native Git labs run on your computer with the offline course checker; you record the pass here."],
  rust: ["Local Cargo tests · self-reported", "Rust exercises are drafts you test with Cargo locally. The Lab does not compile Rust in lessons."],
  linux: ["Simulator + local labs", "Lessons use a limited command simulator. Bash labs and their grading run locally from the source course; completion is self-reported."],
  c: ["Local compiler checks · self-reported", "81 C17 function drills and 12 mastery labs: edit the starters and run the native GCC/Clang checks locally. C does not run in the browser."],
  java: ["Local JDK checks · self-reported", "Eight tasks checked by the native JDK 17 checker on your computer, comparing expected and actual output. Java does not run in the browser."],
};
