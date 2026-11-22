import { Studio, type StudioProject } from "../../features/campus/Studio";
import studio from "../../../public/data/studio.json";
import { experiments } from "../../lib/campus";

export const metadata = { title: "Engineering Studio · SwarmLadder Lab" };

export default function Page() {
  const projects = studio as StudioProject[];
  const titles = new Map(projects.map((p) => [p.id, p.title.replace(/^Project \d+ — /, "")]));
  return <Studio projects={projects} experiments={experiments.map((e) => ({ ...e, title: titles.get(e.project) ?? e.project }))} />;
}
