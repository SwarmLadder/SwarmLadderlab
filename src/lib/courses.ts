// The shelf: courses are enabled only after import, routes and practice UX are ready.
export type Course = {
  id: string;
  title: string;
  language: string;
  blurb: string;
  status: "open" | "soon";
  hue: string;
};
export const courses: Course[] = [
  { id: "python", title: "Python", language: "Python 3.13", blurb: "From your first variable to async services, tested end to end.", status: "open", hue: "#0f5c63" },
  { id: "sql", title: "SQL", language: "SQLite · PostgreSQL labs", blurb: "30 guided lessons, 48 graded challenges, real projects and database engineering.", status: "open", hue: "#7a4b1f" },
  { id: "git", title: "Git & GitHub", language: "Git CLI · offline labs", blurb: "36 guided lessons, 24 native Git labs, workshops, portfolio projects and 45 interview answers.", status: "open", hue: "#8c2f39" },
  { id: "rust", title: "Rust", language: "Rust 2021 · Cargo", blurb: "36 workshops, 168 coding challenges, nine projects, mastery and safe systems programming.", status: "open", hue: "#69407b" },
  { id: "linux", title: "Linux & Bash", language: "Linux · Bash · systemd", blurb: "36 lessons, 12 locally graded Bash labs, 75 practice tasks, 60 interview answers and three operations projects.", status: "open", hue: "#386a54" },
  { id: "dsa", title: "Data Structures & Algorithms", language: "Python · algorithms · interviews", blurb: "36 deep lessons, 48 original coding questions with browser tests, complexity proofs and mock interviews.", status: "open", hue: "#395d86" },
  { id: "c", title: "C", language: "C17 · native compiler", blurb: "36 workshops and deep dives, 12 local mastery labs, 12 projects and systems engineering practice.", status: "open", hue: "#3f6b4f" },
  { id: "javascript", title: "JavaScript", language: "ES2024", blurb: "The language of the web, from the console to the browser.", status: "soon", hue: "#8a6a12" },
];
export const openCourses = courses.filter((c) => c.status === "open");
export const coursePath = (id: string) => "/learn/" + id;
