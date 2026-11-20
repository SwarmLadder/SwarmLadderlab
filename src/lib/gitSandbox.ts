// Stateful, deliberately limited Git teaching simulator. No shell, network or real repo.
export type GitCommit = { id: string; parent: string | null; message: string; files: Record<string, string> };
export type GitSession = {
  branch: string; branches: Record<string, string>; commits: GitCommit[];
  working: Record<string, string>; staged: Record<string, string>;
};
export type GitLine = { name: "stdout" | "stderr"; text: string };
const INITIAL = { "README.md": "# SwarmLadder\nLearn Git one step at a time.\n" };

export function newGitSession(): GitSession {
  const root = { id: "a1b2c3d", parent: null, message: "Initial commit", files: { ...INITIAL } };
  return { branch: "main", branches: { main: root.id }, commits: [root],
    working: { ...INITIAL }, staged: { ...INITIAL } };
}
function same(a: Record<string, string>, b: Record<string, string>) {
  return JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]])) ===
    JSON.stringify(Object.keys(b).sort().map((k) => [k, b[k]]));
}
function head(s: GitSession) {
  return s.commits.find((c) => c.id === s.branches[s.branch])!;
}
function safePath(path: string) {
  return /^[A-Za-z0-9][A-Za-z0-9_.\/-]{0,80}$/.test(path) &&
    !path.split("/").some((p) => p === "." || p === ".." || p === ".git");
}
function words(line: string) {
  return [...line.matchAll(/"([^"]*)"|'([^']*)'|([^\s"']+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
}
export const gitHelp = [
  "Git practice simulator — a learning subset, not native Git.",
  "git status | git log --oneline | git branch | git switch -c feature",
  "write README.md New text | cat README.md | ls",
  "git add README.md | git diff --cached | git commit -m \"Update readme\"",
  "git restore [--staged] README.md | git show | git init",
  "One command per line; no shell pipelines, scripts, remotes or real Git course grading.",
].join("\n");

function status(s: GitSession) {
  const base = head(s).files;
  const names = [...new Set([...Object.keys(base), ...Object.keys(s.staged), ...Object.keys(s.working)])].sort();
  const changes = names.flatMap((name) => {
    const a = s.staged[name] !== base[name] ? "M" : " ";
    const b = s.working[name] !== s.staged[name] ? "M" : " ";
    return a === " " && b === " " ? [] : [a + b + " " + name];
  });
  return "On branch " + s.branch + "\n" + (changes.length ? changes.join("\n") : "nothing to commit, working tree clean");
}
function git(s: GitSession, args: string[]): string {
  const [action, ...rest] = args;
  const current = head(s);
  switch (action) {
    case "--version": return "Git (SwarmLadder browser simulator)";
    case "help": return gitHelp;
    case "status": return status(s);
    case "init": {
      Object.assign(s, newGitSession());
      return "Initialized an isolated practice repository";
    }
    case "add": {
      if (!rest.length) throw Error("Usage: git add <file> or git add .");
      const names = rest.includes(".") || rest.includes("-A")
        ? [...new Set([...Object.keys(s.working), ...Object.keys(s.staged)])]
        : rest;
      for (const name of names) if (!safePath(name) || (!(name in s.working) && !(name in s.staged)))
        throw Error("Missing or unsupported file: " + name);
      for (const name of names) {
        if (name in s.working) s.staged[name] = s.working[name];
        else delete s.staged[name];
      }
      return "Staged " + names.length + " file(s)";
    }
    case "commit": {
      const index = rest.indexOf("-m");
      if (index < 0 || !rest[index + 1]?.trim()) throw Error("Usage: git commit -m \"message\"");
      if (same(s.staged, current.files)) return "nothing to commit, working tree clean";
      const id = (0xabc000 + s.commits.length).toString(16);
      s.commits.push({ id, parent: current.id, message: rest[index + 1], files: { ...s.staged } });
      s.branches[s.branch] = id;
      return "[" + s.branch + " " + id + "] " + rest[index + 1];
    }
    case "log": {
      const oneline = rest.includes("--oneline");
      const log: string[] = [];
      let commit: GitCommit | undefined = head(s);
      while (commit) {
        log.push(oneline ? commit.id + " " + commit.message :
          "commit " + commit.id + "\n    " + commit.message);
        const parent: string | null = commit.parent;
        commit = parent ? s.commits.find((c) => c.id === parent) : undefined;
      }
      return log.join("\n");
    }
    case "branch": {
      if (!rest.length) return Object.keys(s.branches).sort().map((name) =>
        (name === s.branch ? "* " : "  ") + name).join("\n");
      const name = rest[0];
      if (!/^[A-Za-z0-9][\w./-]{0,60}$/.test(name) || name.includes("..") || name.endsWith("/"))
        throw Error("Use a simple branch name");
      if (name in s.branches) throw Error("Branch already exists");
      s.branches[name] = current.id;
      return "Created branch " + name;
    }
    case "switch":
    case "checkout": {
      const create = rest[0] === "-c" || rest[0] === "-b";
      const name = create ? rest[1] : rest[0];
      if (!name) throw Error("Usage: git switch [-c] <branch>");
      if (!same(s.working, s.staged) || !same(s.staged, current.files))
        throw Error("Commit or restore changes before switching branches in this simulator");
      if (create) git(s, ["branch", name]);
      if (!(name in s.branches)) throw Error("Unknown branch: " + name);
      s.branch = name;
      s.working = { ...head(s).files };
      s.staged = { ...head(s).files };
      return "Switched to branch " + name;
    }
    case "diff": {
      const cached = rest.includes("--cached") || rest.includes("--staged");
      const before = cached ? current.files : s.staged;
      const after = cached ? s.staged : s.working;
      const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
        .filter((name) => before[name] !== after[name]);
      return names.length ? names.map((name) =>
        "diff -- " + name + "\n- " + (before[name] ?? "(new)") +
        "\n+ " + (after[name] ?? "(deleted)")).join("\n") : "No changes";
    }
    case "restore": {
      const staged = rest[0] === "--staged";
      const path = staged ? rest[1] : rest[0];
      if (!path || !safePath(path)) throw Error("Usage: git restore [--staged] <file>");
      const before = staged ? current.files : s.staged;
      const after = staged ? s.staged : s.working;
      if (!(path in before) && !(path in after)) throw Error("No such file: " + path);
      if (path in before) after[path] = before[path];
      else delete after[path];
      return staged ? "Unstaged " + path : "Restored " + path;
    }
    case "show": return "commit " + current.id + "\n    " + current.message +
      "\nFiles: " + Object.keys(current.files).sort().join(", ");
    default: throw Error("Unsupported Git command: " + String(action) + ". Type help.");
  }
}
export function runGit(s: GitSession, source: string): { lines: GitLine[]; ok: boolean } {
  if (source.length > 10000) return { lines: [{ name: "stderr", text: "Maximum 10,000 characters" }], ok: false };
  const commands = source.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  if (commands.length > 40) return { lines: [{ name: "stderr", text: "Maximum 40 commands per run" }], ok: false };
  const lines: GitLine[] = [];
  let ok = true;
  for (const command of commands) {
    try {
      if (/[;|&]/.test(command) || command.includes(String.fromCharCode(96)) || command.includes("$("))
        throw Error("Shell operators are not supported in the Git simulator");
      const tokens = words(command);
      let result: string;
      if (tokens[0] === "git") result = git(s, tokens.slice(1));
      else if (tokens[0] === "help") result = gitHelp;
      else if (tokens[0] === "ls") result = Object.keys(s.working).sort().join("\n") || "(empty)";
      else if (tokens[0] === "cat") {
        if (!tokens[1] || !(tokens[1] in s.working)) throw Error("File not found");
        result = s.working[tokens[1]];
      } else if (tokens[0] === "write") {
        const path = tokens[1];
        if (!path || !safePath(path)) throw Error("Usage: write <safe-file-path> <text>");
        const contents = tokens.slice(2).join(" ");
        if (!contents) throw Error("Provide text to write");
        s.working[path] = contents + "\n";
        result = "Wrote " + path + " (simulator only)";
      } else throw Error("Unsupported command. Type help for the supported subset.");
      lines.push({ name: "stdout", text: "$ " + command + "\n" + result + "\n" });
    } catch (error) {
      ok = false;
      lines.push({ name: "stderr", text: "$ " + command + "\n" +
        (error instanceof Error ? error.message : String(error)) + "\n" });
      break;
    }
  }
  if (!commands.length) lines.push({ name: "stdout", text: gitHelp + "\n" });
  return { lines, ok };
}
