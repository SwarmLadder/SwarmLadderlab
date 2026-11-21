import pythonData from "../../public/data/catalog.json";
import sqlData from "../../public/data/sql/catalog.json";
import gitData from "../../public/data/git/catalog.json";
import rustData from "../../public/data/rust/catalog.json";
import linuxData from "../../public/data/linux/catalog.json";
import dsaData from "../../public/data/dsa/catalog.json";
import cData from "../../public/data/c/catalog.json";
import type { Catalog } from "../lib/course";

// Each JSON catalog is generated from the matching upstream source repository.
export type CourseId = "python" | "sql" | "git" | "rust" | "linux" | "dsa" | "c";
const data: Record<CourseId, Catalog> = {
  python: pythonData,
  sql: sqlData,
  git: gitData,
  rust: rustData,
  linux: linuxData,
  dsa: dsaData,
  c: cData,
};
export function catalog(course: CourseId = "python"): Catalog {
  return data[course];
}
