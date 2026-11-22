// Studio project data (generated into data/studio.json by build/build_site.py) and
// helpers shared by the server-rendered project pages and the client list.
export type StudioProject = {
  id: string;
  level: "basics" | "intermediate" | "advanced";
  title: string;
  brief: string;
  skills: string;
  prerequisite: string;
  scope: string[];
  acceptance: string[];
  automaticCheck: boolean;
  source: string;
  package: { path: string; source: string; install: string; test: string } | null;
};
export const levelName = { basics: "Basics", intermediate: "Intermediate", advanced: "Advanced" } as const;
export const projectName = (p: StudioProject) => p.title.replace(/^Project \d+ — /, "");
export const evaluation = (p: StudioProject) => p.automaticCheck ? "Automatic ticket check" : "Review required";
