export const courseRepo = "https://github.com/SwarmLadder/python-notebook";
export const labRepo = "https://github.com/SwarmLadder/SwarmLadderlab";
export type Item = { id: string; title: string; graded: number };
export type Level = {
  id: string;
  title: string;
  medal: string;
  total: number;
  sections: { id: string; title: string; items: Item[] }[];
};
// A practice pack. Workbook packs are keyed by their notebook id; lesson packs
// ("pack:<module>") list which lesson holds each challenge.
export type Workbook = { level: string; module: string; exercises: string[]; title?: string; lessons?: Record<string, string> };
export type Catalog = { course?: string; levels: Level[]; workbooks: Record<string, Workbook> };
export type CodeCell = {
  type: "code";
  id: string;
  kind: string;
  requires_cells?: string[];
  assessment?: string | null;
  source: string;
};
export type Notebook = {
  revision?: string;
  id: string;
  title: string;
  folder: string;
  graded: string[];
  cells: (CodeCell | { type: "md"; html: string })[];
};
export const lessonPath = (id: string) => "/lesson/" + id;
async function json<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw Error("Unable to load " + path);
  return response.json();
}
export const catalogData = () => json<Catalog>("/data/catalog.json");
export const notebookData = (id: string, signal?: AbortSignal) =>
  json<Notebook>(
    "/data/nb/" + encodeURIComponent(id.replaceAll("/", "__")) + ".json",
    signal,
  );
export function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.download = name;
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
