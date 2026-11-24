import { notFound } from "next/navigation";
import { Roadmap } from "../../../features/roadmap/Roadmap";
import { Personal } from "../../Personal";
import { catalog, type CourseId } from "../../catalog";
import { courses } from "../../../lib/courses";
import { buildRoadmap, type Concept, type DsaConcepts } from "../../../lib/roadmap";
import concepts from "../../../../public/data/concepts.json";
import dsaConcepts from "../../../../public/data/dsa/concepts.json";

// Every course's main page is its roadmap; /learn/<course>/roadmap shows the same page.
export function CoursePage({ id }: { id: string }) {
  const course = courses.find((c) => c.id === id && c.status === "open");
  if (!course) notFound();
  const data = buildRoadmap(id, catalog(id as CourseId), id === "python" ? concepts as Concept[] : [], dsaConcepts as unknown as DsaConcepts);
  return (
    <Personal>
      <div className="shell page-pad">
        <Roadmap data={data} courseTitle={course.title} courseId={id} language={course.language} />
      </div>
    </Personal>
  );
}
