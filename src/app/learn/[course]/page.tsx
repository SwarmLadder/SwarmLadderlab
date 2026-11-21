import { notFound } from "next/navigation";
import { CourseRoute } from "../../../features/course/CourseRoute";
import { Personal } from "../../Personal";
import { catalog, type CourseId } from "../../catalog";
import { courses, openCourses } from "../../../lib/courses";

export const dynamicParams = false;
export function generateStaticParams() {
  return openCourses.map((c) => ({ course: c.id }));
}
export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  const id = (await params).course;
  const course = courses.find((c) => c.id === id && c.status === "open");
  if (!course || !["python", "sql", "git", "rust", "linux"].includes(id)) notFound();
  return (
    <Personal>
      <CourseRoute catalog={catalog(id as CourseId)} course={course} />
    </Personal>
  );
}
