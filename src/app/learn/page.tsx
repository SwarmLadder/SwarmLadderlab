import { CourseLibrary, type CourseEntry } from "../../features/course/CourseLibrary";
import { catalog, type CourseId } from "../catalog";
import { courses } from "../../lib/courses";
import { schools } from "../../lib/campus";
import { summarizeCourse } from "../../lib/courseDirectory";

export const metadata = { title: "Courses · SwarmLadder Lab" };

export default function Page() {
  const entries: CourseEntry[] = courses.map((course) => {
    const data = course.status === "open" ? catalog(course.id as CourseId) : undefined;
    // What a course contains, straight from its catalog: section titles with item counts.
    const inside = new Map<string, number>();
    for (const level of data?.levels ?? []) for (const section of level.sections) {
      inside.set(section.title, (inside.get(section.title) ?? 0) + section.items.length);
    }
    return {
      summary: summarizeCourse(course, data),
      school: schools.find((s) => (s.courses as string[]).includes(course.id))?.id ?? null,
      inside: [...inside].map(([title, count]) => ({ title, count })),
    };
  });
  return <CourseLibrary entries={entries} schools={schools.map(({ id, title }) => ({ id, title }))} />;
}
