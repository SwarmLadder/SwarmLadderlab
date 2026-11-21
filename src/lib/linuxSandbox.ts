// No shell, host files, network or subprocesses: a tiny teaching model.
export type LinuxLine = { name: "stdout" | "stderr"; text: string };
export type LinuxSession = { cwd: string; dirs: string[]; files: Record<string, string> };

export function newLinuxSession(): LinuxSession {
  return {
    cwd: "/home/learner",
    dirs: ["/", "/home", "/home/learner", "/home/learner/logs", "/home/learner/data"],
    files: {
      "/home/learner/README.md": "Welcome to the SwarmLadder Linux teaching simulator.\nType help to see what is supported.\n",
      "/home/learner/logs/app.log": "2026-11-20 INFO user=ana action=login\n2026-11-20 ERROR user=bob action=timeout\n2026-11-20 ERROR user=ana action=denied\n",
      "/home/learner/data/latencies.txt": "10\n20\n30\n50\n100\n",
    },
  };
}

export const linuxHelp = [
  "SwarmLadder Linux teaching simulator — NOT a real Linux shell.",
  "pwd | ls [-l] [PATH] | cd DIR | cat FILE | whoami | uname",
  "head [-n NUMBER] FILE | tail [-n NUMBER] FILE | wc [-l|-c] FILE",
  "grep [-n|-i|-c] PATTERN FILE | find [DIR] | sort [-u] FILE",
  "mkdir DIR | touch FILE | write FILE TEXT | help",
  "One command per line. No pipes, redirects, Bash scripts, sudo, network, or host files.",
  "Real Bash labs must be verified locally using python tools/grade.py.",
].join("\n");

function args(line: string): string[] {
  const found = line.match(/"[^"]*"|'[^']*'|[^\s"']+/g) ?? [];
  if (found.join("").length !== line.replace(/\s/g, "").length) {
    throw Error("Unsupported or unclosed quotes");
  }
  return found.map((word) => word.startsWith('"') || word.startsWith("'") ? word.slice(1, -1) : word);
}

function resolve(session: LinuxSession, input = "."): string {
  const source = input === "~" ? "/home/learner" : input.startsWith("~/") ? "/home/learner/" + input.slice(2) : input;
  const absolute = source.startsWith("/") ? source : session.cwd + "/" + source;
  const parts: string[] = [];
  for (const piece of absolute.split("/")) {
    if (!piece || piece === ".") continue;
    if (piece === "..") parts.pop();
    else parts.push(piece);
  }
  const path = "/" + parts.join("/");
  if (path.length > 160) throw Error("Path too long for this simulator");
  return path;
}

function file(session: LinuxSession, path: string): string {
  const p = resolve(session, path);
  if (!Object.hasOwn(session.files, p)) throw Error("No such file: " + path);
  return session.files[p];
}

function list(session: LinuxSession, target: string, detail: boolean): string {
  const path = resolve(session, target);
  if (Object.hasOwn(session.files, path)) {
    return detail ? "-rw-r--r--  learner " + session.files[path].length + " " + target : target;
  }
  if (!session.dirs.includes(path)) throw Error("No such directory: " + target);
  const children = new Set<string>();
  for (const entry of [...session.dirs, ...Object.keys(session.files)]) {
    if (entry.startsWith(path === "/" ? "/" : path + "/") && entry !== path) {
      const suffix = entry.slice(path === "/" ? 1 : path.length + 1);
      if (suffix && !suffix.includes("/")) children.add(suffix);
    }
  }
  return [...children].sort().map((name) => {
    if (!detail) return name;
    const targetPath = path.replace(/\/$/, "") + "/" + name;
    return session.dirs.includes(targetPath) ? "drwxr-xr-x  learner " + name :
      "-rw-r--r--  learner " + session.files[targetPath].length + " " + name;
  }).join("\n") || "(empty)";
}

function execute(session: LinuxSession, tokens: string[]): string {
  const [cmd, ...rest] = tokens;
  switch (cmd) {
    case "help": return linuxHelp;
    case "pwd": return session.cwd;
    case "whoami": return "learner (simulated)";
    case "uname": return "Linux (educational simulator; no host details)";
    case "ls": return list(session, rest.find((v) => !v.startsWith("-")) ?? ".", rest.includes("-l"));
    case "cd": {
      const target = resolve(session, rest[0] ?? "~");
      if (!session.dirs.includes(target)) throw Error("No such directory: " + target);
      session.cwd = target;
      return "";
    }
    case "cat": {
      if (rest.length !== 1) throw Error("Usage: cat FILE");
      return file(session, rest[0]).replace(/\n$/, "");
    }
    case "head":
    case "tail": {
      const start = rest[0] === "-n" ? 2 : 0;
      const count = start ? Number(rest[1]) : 10;
      if (!Number.isInteger(count) || count < 0 || count > 1000 || rest.length !== start + 1)
        throw Error("Usage: " + cmd + " [-n NUMBER] FILE");
      const lines = file(session, rest[start]).replace(/\n$/, "").split("\n");
      const sample = count === 0 ? [] : cmd === "head" ? lines.slice(0, count) : lines.slice(-count);
      return sample.join("\n");
    }
    case "wc": {
      const type = rest[0] === "-l" || rest[0] === "-c" ? rest[0] : "-l";
      const filename = type === rest[0] ? rest[1] : rest[0];
      if (!filename || rest.length !== (type === rest[0] ? 2 : 1)) throw Error("Usage: wc [-l|-c] FILE");
      const data = file(session, filename);
      return String(type === "-l" ? (data.match(/\n/g) ?? []).length : new TextEncoder().encode(data).length);
    }
    case "grep": {
      const flags = rest.filter((v) => /^-[nicF]+$/.test(v));
      const values = rest.filter((v) => !/^-[nicF]+$/.test(v));
      if (values.length !== 2 || rest.some((v) => v.startsWith("-") && !/^-[nicF]+$/.test(v)))
        throw Error("Usage: grep [-n|-i|-c|-F] PATTERN FILE (literal matching only)");
      const [pattern, name] = values;
      const data = file(session, name).replace(/\n$/, "");
      const lines = data ? data.split("\n") : [];
      const match = lines.flatMap((line, index) =>
        (flags.join("").includes("i") ? line.toLowerCase().includes(pattern.toLowerCase()) : line.includes(pattern))
          ? [flags.join("").includes("n") ? (index + 1) + ":" + line : line] : []);
      if (flags.join("").includes("c")) return String(match.length);
      if (!match.length) throw Error("No matching lines (grep exit status 1)");
      return match.join("\n");
    }
    case "find": {
      if (rest.some((v) => v.startsWith("-"))) throw Error("Only find [DIR] is supported here");
      const root = resolve(session, rest[0] ?? ".");
      if (!session.dirs.includes(root)) throw Error("No such directory: " + root);
      return Object.keys(session.files).filter((p) => p.startsWith(root === "/" ? "/" : root + "/")).sort().join("\n");
    }
    case "sort": {
      const unique = rest[0] === "-u";
      const name = rest[unique ? 1 : 0];
      if (!name || rest.length !== (unique ? 2 : 1)) throw Error("Usage: sort [-u] FILE");
      const lines = file(session, name).replace(/\n$/, "").split("\n").sort();
      return (unique ? [...new Set(lines)] : lines).join("\n");
    }
    case "mkdir": {
      if (rest.length !== 1) throw Error("Usage: mkdir DIR");
      const p = resolve(session, rest[0]);
      if (session.dirs.includes(p) || Object.hasOwn(session.files, p)) throw Error("Already exists: " + p);
      if (!session.dirs.includes(p.slice(0, p.lastIndexOf("/")) || "/")) throw Error("Parent directory missing");
      session.dirs.push(p);
      return "Created " + p + " (virtual directory)";
    }
    case "touch":
    case "write": {
      if (rest.length < 1 || (cmd === "touch" && rest.length !== 1))
        throw Error("Usage: " + cmd + " FILE" + (cmd === "write" ? " TEXT" : ""));
      const p = resolve(session, rest[0]);
      if (!session.dirs.includes(p.slice(0, p.lastIndexOf("/")) || "/") || session.dirs.includes(p))
        throw Error("Invalid file path");
      if (cmd === "touch") session.files[p] ??= "";
      else session.files[p] = rest.slice(1).join(" ") + "\n";
      return (cmd === "touch" ? "Touched " : "Wrote ") + p + " (virtual file)";
    }
    default: throw Error("Unsupported command: " + cmd + ". Type help for the safe subset.");
  }
}

export function runLinux(session: LinuxSession, source: string): { lines: LinuxLine[]; ok: boolean } {
  if (source.length > 10000) return { lines: [{ name: "stderr", text: "Limit: 10,000 characters." }], ok: false };
  const commands = source.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  if (commands.length > 40) return { lines: [{ name: "stderr", text: "Limit: 40 commands per run." }], ok: false };
  const lines: LinuxLine[] = [];
  let ok = true;
  for (const command of commands) {
    try {
      if (/[;|&<>$]/.test(command) || command.includes(String.fromCharCode(96)) ||
          command.includes("\\") || command.includes("$("))
        throw Error("Shell operators, substitutions and scripts are not supported here.");
      const tokens = args(command);
      if (!tokens.length) continue;
      const result = execute(session, tokens);
      if (result) lines.push({ name: "stdout", text: result });
    } catch (err) {
      ok = false;
      lines.push({ name: "stderr", text: err instanceof Error ? err.message : "Command not supported" });
    }
  }
  return { lines: lines.length ? lines : [{ name: "stdout", text: "No output" }], ok };
}
