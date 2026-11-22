import type { CodeCell, Notebook } from "../../lib/course";

export function executionPlan(nb: Notebook, target: string): CodeCell[] {
  const cells = nb.cells.filter((c): c is CodeCell => c.type === "code");
  const positions = new Map(cells.map((c, i) => [c.id, i]));
  const included = new Set<string>();
  function include(id: string, before = cells.length) {
    const index = positions.get(id);
    if (index === undefined || index >= before) throw Error("Expected an earlier code cell: " + id);
    if (included.has(id)) return;
    for (const dep of cells[index].requires_cells ?? []) include(dep, index);
    included.add(id);
  }
  for (const c of cells) if (c.kind === "setup") include(c.id);
  include(target);
  return cells.filter(c => included.has(c.id));
}
