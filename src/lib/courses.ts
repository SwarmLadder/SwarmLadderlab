// The shelf: every course the Lab offers or is preparing.
// To add a course: give it an entry here, build its catalog with build/prepare.py
// into public/data/<id>/, and set status to "open".
export type Course = {
  id: string;
  title: string;
  language: string; // programming language shown on the spine
  blurb: string;
  status: "open" | "soon";
  hue: string; // spine colour, picked to sit on paper in both themes
};
export const courses: Course[] = [
  { id: "python", title: "Python", language: "Python 3.13", blurb: "From your first variable to async services, tested end to end.", status: "open", hue: "#0f5c63" },
  { id: "sql", title: "SQL", language: "SQLite", blurb: "Ask precise questions of real data, then design the tables yourself.", status: "soon", hue: "#7a4b1f" },
  { id: "c", title: "C", language: "C17", blurb: "Memory, pointers and the machine underneath every language.", status: "soon", hue: "#3f6b4f" },
  { id: "javascript", title: "JavaScript", language: "ES2024", blurb: "The language of the web, from the console to the browser.", status: "soon", hue: "#8a6a12" },
  { id: "git", title: "Git", language: "Command line", blurb: "Save, branch, collaborate and undo with confidence.", status: "soon", hue: "#8c2f39" },
];
export const openCourses = courses.filter((c) => c.status === "open");
export const coursePath = (id: string) => "/learn/" + id;
