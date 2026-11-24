import { CoursePage } from "./CoursePage";
import { openCourses } from "../../../lib/courses";

export const dynamicParams = false;
export function generateStaticParams() {
  return openCourses.map((c) => ({ course: c.id }));
}
export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  return <CoursePage id={(await params).course} />;
}
