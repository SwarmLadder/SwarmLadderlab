// Fetch both curricula when generated static assets are missing.
// The Lab can build from a single checkout on Cloudflare Workers Builds.
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (existsSync("public/data/catalog.json") && existsSync("public/data/sql/catalog.json")
    && existsSync("public/course/sql/fixtures/base.sql")) process.exit(0);

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

function source(env, local, generated, defaultRepo, repoOverride) {
  let course = process.env[env] || local;
  if (!existsSync(course)) {
    course = generated;
    if (!existsSync(course)) {
      const repo = process.env[repoOverride] || defaultRepo;
      console.log("Fetching the course from " + repo);
      run("git", ["clone", "--depth", "1", repo, course]);
    }
  }
  return course;
}
const course = source("COURSE", "../python-notebook", ".generated/python-notebook",
  "https://github.com/SwarmLadder/python-notebook", "COURSE_REPO");
const sql = source("SQL_COURSE", "../SQL", ".generated/SQL",
  "https://github.com/SwarmLadder/SQL", "SQL_COURSE_REPO");

try {
  execFileSync(python, ["-c", "import markdown"], { stdio: "ignore" });
} catch {
  const pip = [python, "-m", "pip", "install", "--user", "--quiet", "markdown"];
  try {
    run(pip[0], pip.slice(1));
  } catch {
    run(pip[0], [...pip.slice(1), "--break-system-packages"]);
  }
}
console.log("Preparing Python and SQL curricula");
run(python, ["build/prepare.py", "--course", course, "--sql-course", sql]);
