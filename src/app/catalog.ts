import pythonData from "../../public/data/catalog.json";
import sqlData from "../../public/data/sql/catalog.json";
import type { Catalog } from "../lib/course";

// Both JSON imports are emitted by build/prepare.py before Vite compiles routes.
export function catalog(course: "python" | "sql" = "python"): Catalog {
  return course === "sql" ? sqlData : pythonData;
}
