import { Home } from "../features/home/Home";
import { Personal } from "./Personal";
import { catalog, type CourseId } from "./catalog";
import { openCourses } from "../lib/courses";
import { schools } from "../lib/campus";
import { buildRoadmap, type Concept } from "../lib/roadmap";
import concepts from "../../public/data/concepts.json";
import studio from "../../public/data/studio.json";

export default function Page() {
  const roadmap = buildRoadmap("python", catalog("python"), concepts as Concept[]);
  const facts = {
    courses: openCourses.length,
    activities: openCourses.reduce((n, c) => n + catalog(c.id as CourseId).levels.reduce((m, l) => m + l.sections.reduce((k, s) => k + s.items.length, 0), 0), 0),
    projects: studio.length,
    schools: schools.length,
    stages: roadmap.levels.reduce((n, l) => n + l.stages.length, 0),
  };
  return (
    <Personal>
      <Home
        catalog={catalog("python")}
        sqlCatalog={catalog("sql")}
        gitCatalog={catalog("git")}
        rustCatalog={catalog("rust")}
        linuxCatalog={catalog("linux")}
        dsaCatalog={catalog("dsa")}
        cCatalog={catalog("c")}
        roadmap={roadmap}
        facts={facts}
      />
    </Personal>
  );
}
