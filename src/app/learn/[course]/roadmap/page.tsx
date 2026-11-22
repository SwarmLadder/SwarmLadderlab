import { notFound } from "next/navigation";
import { Roadmap } from "../../../../features/roadmap/Roadmap";
import { Personal } from "../../../Personal";
import { catalog, type CourseId } from "../../../catalog";
import { courses, openCourses } from "../../../../lib/courses";
import { buildRoadmap, type Concept } from "../../../../lib/roadmap";
import concepts from "../../../../../public/data/concepts.json";

export const dynamicParams = false;
export function generateStaticParams() {
  return openCourses.map((c) => ({ course: c.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ course: string }> }) {
  const id = (await params).course;
  const course = courses.find((c) => c.id === id);
  return { title: (course?.title ?? "Course") + " roadmap · SwarmLadder Lab" };
}
export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  const id = (await params).course;
  const course = courses.find((c) => c.id === id && c.status === "open");
  if (!course) notFound();
  const data = buildRoadmap(id, catalog(id as CourseId), id === "python" ? concepts as Concept[] : []);
  return (
    <Personal>
      <div className="shell page-pad">
        <Roadmap data={data} courseTitle={course.title} courseId={id} />
      </div>
    </Personal>
  );
}
