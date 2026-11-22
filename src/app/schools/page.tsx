import { Schools, type SchoolView } from "../../features/campus/Schools";
import { catalog } from "../catalog";
import { courses } from "../../lib/courses";
import { schools } from "../../lib/campus";
import { summarizeCourse } from "../../lib/courseDirectory";

export const metadata = { title: "Schools · SwarmLadder Lab" };

export default function Page() {
  const python = catalog("python");
  const titles = new Map(python.levels.flatMap((l) => l.sections.flatMap((s) => s.items.map((i) => [i.id, i.title] as const))));
  const view: SchoolView[] = schools.map((school) => ({
    ...school,
    summaries: school.courses.map((id) => summarizeCourse(courses.find((c) => c.id === id)!, catalog(id))),
    highlightItems: (school.highlights ?? []).map((h) => ({ ...h, title: titles.get(h.id) ?? h.id })),
  }));
  return <Schools schools={view} />;
}
