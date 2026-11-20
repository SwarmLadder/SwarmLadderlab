import { CourseLibrary } from "../../features/course/CourseLibrary";
import { catalog, type CourseId } from "../catalog";
import { courses } from "../../lib/courses";
import { summarizeCourse } from "../../lib/courseDirectory";

export default function Page() {
  const summaries = courses.map((course) => summarizeCourse(
    course, course.status === "open" ? catalog(course.id as CourseId) : undefined,
  ));
  return <CourseLibrary summaries={summaries} />;
}
