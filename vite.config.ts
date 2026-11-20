import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

// Every build path (npm run build, cf deploy, Cloudflare Workers Builds) loads this file,
// so prepare the generated curriculum here if a fresh checkout doesn't have it yet.
if (!existsSync("public/data/catalog.json") || !existsSync("public/data/sql/catalog.json") || !existsSync("public/course/sql/fixtures/base.sql") || !existsSync("public/data/git/catalog.json") || !existsSync("public/data/rust/catalog.json")) {
  execFileSync(process.execPath, ["scripts/ensure-curriculum.mjs"], { stdio: "inherit" });
}

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
