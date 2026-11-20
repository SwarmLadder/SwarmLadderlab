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
export type Workbook = { level: string; module: string; exercises: string[] };
export type Catalog = { levels: Level[]; workbooks: Record<string, Workbook> };
export type CodeCell = {
  type: "code";
  id: string;
  kind: string;
  source: string;
};
export type Notebook = {
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
