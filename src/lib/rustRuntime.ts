// Rust Playground is the official external compiler service. Unlike Python and
// SQLite, Rust is NOT executed in SwarmLadder's own browser worker.
// Source is sent only when the learner explicitly clicks Run Rust.
export type RustExecution = {
  success: boolean;
  stdout: string;
  stderr: string;
  exitDetail: string;
};
export const RUST_PLAYGROUND = "https://play.rust-lang.org/";
export function rustPlaygroundLink(source: string) {
  return RUST_PLAYGROUND + "?version=stable&mode=debug&edition=2021&code=" +
    encodeURIComponent(source);
}
export async function executeRust(source: string, signal?: AbortSignal): Promise<RustExecution> {
  if (!source.trim()) throw Error("Write a Rust program first.");
  if (new TextEncoder().encode(source).length > 32_768)
    throw Error("Rust Playground limit: 32 KiB of source code.");
  const response = await fetch(RUST_PLAYGROUND + "execute", {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    signal,
    body: JSON.stringify({
      channel: "stable",
      mode: "debug",
      edition: "2021",
      crateType: "bin",
      tests: false,
      backtrace: false,
      code: source,
    }),
  });
  if (!response.ok) throw Error("Rust Playground returned HTTP " + response.status);
  const result: unknown = await response.json();
  if (typeof result !== "object" || result === null) throw Error("Unexpected Rust compiler response");
  const record = result as Record<string, unknown>;
  if (typeof record.success !== "boolean" ||
      typeof record.stdout !== "string" || typeof record.stderr !== "string")
    throw Error("Unexpected Rust compiler response");
  const max = 60_000;
  return {
    success: record.success,
    stdout: record.stdout.slice(0, max),
    stderr: record.stderr.slice(0, max),
    exitDetail: typeof record.exitDetail === "string" ? record.exitDetail.slice(0, 1_000) : "",
  };
}
