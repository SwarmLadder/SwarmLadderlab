import pythonData from "../../public/data/catalog.json";
import sqlData from "../../public/data/sql/catalog.json";
import gitData from "../../public/data/git/catalog.json";
import rustData from "../../public/data/rust/catalog.json";
import linuxData from "../../public/data/linux/catalog.json";
import type { Catalog } from "../lib/course";

// All four JSON catalogs are generated from their source repositories before Vite.
export type CourseId = "python" | "sql" | "git" | "rust" | "linux";
const data: Record<CourseId, Catalog> = {
  python: pythonData,
  sql: sqlData,
  git: gitData,
  rust: rustData,
  linux: linuxData,
};
export function catalog(course: CourseId = "python"): Catalog {
  return data[course];
}
