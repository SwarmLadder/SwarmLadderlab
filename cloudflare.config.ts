import { bindings, defineConfig } from "cf/config";
export default defineConfig(({ mode }) => ({
  worker: {
    name: mode === "release" ? "swarmladder-lab" : "swarmladder-lab-staging",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-20",
    assets: { notFoundHandling: "none" },
    env: { ASSETS: bindings.assets() },
  },
}));
