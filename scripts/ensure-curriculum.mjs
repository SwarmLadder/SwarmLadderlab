// Fetch all seven curricula when generated static assets are missing.
// The Lab can build from a single checkout on Cloudflare Workers Builds.
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

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
const revision = JSON.parse(readFileSync("build/python-revision.json", "utf8"));
const head = () => execFileSync("git", ["-C", course, "rev-parse", "HEAD"], {encoding: "utf8"}).trim();
if (head() !== revision && course === ".generated/python-notebook") {
  run("git", ["-C", course, "fetch", "--depth=1", "origin", revision]);
  run("git", ["-C", course, "checkout", "--detach", revision]);
}
if (execFileSync("git", ["-C", course, "status", "--porcelain", "--untracked-files=no"], {encoding: "utf8"}).trim()) throw Error("Python checkout has modified tracked files");
if (head() !== revision) throw Error("Python curriculum checkout must match " + revision);
const sql = source("SQL_COURSE", "../SQL", ".generated/SQL",
  "https://github.com/SwarmLadder/SQL", "SQL_COURSE_REPO");
const git = source("GIT_COURSE", "../git-github-course", ".generated/git-github-course",
  "https://github.com/SwarmLadder/git-github-course", "GIT_COURSE_REPO");
const rust = source("RUST_COURSE", "../RUST", ".generated/RUST",
  "https://github.com/SwarmLadder/RUST", "RUST_COURSE_REPO");
const linux = source("LINUX_COURSE", "../linux-course", ".generated/linux-course",
  "https://github.com/SwarmLadder/linux-course", "LINUX_COURSE_REPO");
const dsa = source("DSA_COURSE", "../Data-Structures-Algorithms", ".generated/Data-Structures-Algorithms",
  "https://github.com/SwarmLadder/Data-Structures-Algorithms", "DSA_COURSE_REPO");
const c = source("C_COURSE", "../C", ".generated/C",
  "https://github.com/SwarmLadder/C", "C_COURSE_REPO");
const java = source("JAVA_COURSE", "../Java", ".generated/Java",
  "https://github.com/SwarmLadder/Java", "JAVA_COURSE_REPO");

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
console.log("Preparing Python, SQL, Git, Rust, Linux, DSA and C curricula");
run(python, ["build/prepare.py", "--course", course, "--sql-course", sql,
  "--git-course", git, "--rust-course", rust, "--linux-course", linux,
  "--dsa-course", dsa, "--c-course", c, "--java-course", java]);
