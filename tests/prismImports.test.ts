import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

// Prism language add-ons need the global set up in src/lib/prismCore.ts. Importing
// prismjs anywhere else let an add-on run first on the server, and every Python
// and DSA lesson page failed with "Prism is not defined".
test("Prism is only imported through src/lib/prism.ts", () => {
  const allowed = new Set([join("src", "lib", "prism.ts"), join("src", "lib", "prismCore.ts")]);
  const offenders = sources("src").filter(
    (path) => !allowed.has(path) && /from\s+["']prismjs|import\s+["']prismjs/.test(readFileSync(path, "utf8")),
  );
  assert.deepEqual(offenders, []);
});
