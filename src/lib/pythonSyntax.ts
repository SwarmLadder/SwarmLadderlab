import Prism from "prismjs";
import "prismjs/components/prism-python.js";

// Prism escapes source text before inserting token spans, including during edits.
export function highlightPython(source: string): string {
  return Prism.highlight(source, Prism.languages.python, "python");
}
