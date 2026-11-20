import data from "../../public/data/catalog.json";
import type { Catalog } from "../lib/course";
export function catalog(): Catalog {
  return data;
}
