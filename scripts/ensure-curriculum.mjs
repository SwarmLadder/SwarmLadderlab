// Makes sure the generated curriculum (public/data, public/course) exists before a build.
// CI and local development prepare it explicitly; hosted builders such as Cloudflare
// Workers Builds only check out this repository, so fetch the course and prepare it here.
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (existsSync("public/data/catalog.json")) process.exit(0);

const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });
const python = ["python3", "python"].find((p) => {
  try {
    execFileSync(p, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});
if (!python) throw new Error("Python 3 is required to prepare the curriculum.");

let course = process.env.COURSE || "../python-notebook";
if (!existsSync(course)) {
  course = ".generated/python-notebook";
  if (!existsSync(course)) {
    const repo = process.env.COURSE_REPO || "https://github.com/SwarmLadder/python-notebook";
    console.log(`Fetching the course from ${repo}`);
    run("git", ["clone", "--depth", "1", repo, course]);
  }
}
try {
  execFileSync(python, ["-c", "import markdown"], { stdio: "ignore" });
} catch {
  const pip = [python, "-m", "pip", "install", "--user", "--quiet", "markdown"];
  try {
    run(pip[0], pip.slice(1));
  } catch {
    // Newer system Pythons refuse user installs without this flag (PEP 668).
    run(pip[0], [...pip.slice(1), "--break-system-packages"]);
  }
}
console.log(`Preparing the curriculum from ${course}`);
run(python, ["build/prepare.py", "--course", course]);
