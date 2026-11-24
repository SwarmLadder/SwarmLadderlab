import { CoursePage } from "../CoursePage";
import { courses, openCourses } from "../../../../lib/courses";

export const dynamicParams = false;
export function generateStaticParams() {
  return openCourses.map((c) => ({ course: c.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ course: string }> }) {
  const id = (await params).course;
  const course = courses.find((c) => c.id === id);
  return { title: (course?.title ?? "Course") + " · SwarmLadder Lab" };
}
export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  return <CoursePage id={(await params).course} />;
}
