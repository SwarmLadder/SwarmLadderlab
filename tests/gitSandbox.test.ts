import test from "node:test";
import assert from "node:assert/strict";
import { newGitSession, runGit } from "../src/lib/gitSandbox.ts";

test("Git simulator stages, commits and shows history across calls", () => {
  const session = newGitSession();
  assert.match(runGit(session, "git status").lines[0].text, /working tree clean/);
  const edited = runGit(session, "write README.md Changed content\ngit status\ngit diff");
  assert.equal(edited.ok, true);
  assert.match(edited.lines[1].text, /M README.md/);
  assert.match(edited.lines[2].text, /Changed content/);

  const committed = runGit(session, 'git add README.md\ngit commit -m "Improve docs"\ngit status');
  assert.equal(committed.ok, true);
  assert.match(committed.lines[1].text, /Improve docs/);
  assert.match(committed.lines[2].text, /working tree clean/);
  const log = runGit(session, "git log --oneline");
  assert.match(log.lines[0].text, /Improve docs/);
  assert.match(log.lines[0].text, /Initial commit/);
});

test("branch switching restores checked-out snapshots, no filesystem writes", () => {
  const s = newGitSession();
  assert.equal(runGit(s, "git switch -c feature").ok, true);
  runGit(s, 'write README.md "Feature content"');
  assert.equal(runGit(s, 'git add README.md\ngit commit -m "Feature"').ok, true);
  assert.equal(runGit(s, "git switch main").ok, true);
  assert.match(runGit(s, "cat README.md").lines[0].text, /Learn Git/);
  assert.equal(runGit(s, "git switch feature").ok, true);
  assert.match(runGit(s, "cat README.md").lines[0].text, /Feature content/);
});

test("Git simulator keeps unstaged edits separate and can revert", () => {
  const s = newGitSession();
  runGit(s, "write README.md unsaved");
  assert.equal(runGit(s, "git diff --cached").lines[0].text.includes("No changes"), true);
  runGit(s, "git add README.md");
  assert.match(runGit(s, "git diff --cached").lines[0].text, /unsaved/);
  runGit(s, "git restore --staged README.md");
  assert.match(runGit(s, "git status").lines[0].text, / M README.md/);
  runGit(s, "git restore README.md");
  assert.match(runGit(s, "git status").lines[0].text, /working tree clean/);
});

test("disallows pipes, dangerous shell, traversal, unknown commands, and huge scripts", () => {
  const s = newGitSession();
  for (const command of [
    "rm -rf .", "git push --force", "git status | cat", "write ../secret content",
    "write .git/config unsafe", "git switch -c ../../escape", "git add missing.txt",
  ]) assert.equal(runGit(s, command).ok, false, command);
  assert.equal(runGit(s, "x".repeat(10001)).ok, false);
  assert.equal(runGit(s, Array(42).fill("git status").join("\n")).ok, false);
  assert.match(runGit(s, "git status").lines[0].text, /working tree clean/);
});

test("simulator reset discards only in-browser practice state", () => {
  const s = newGitSession();
  runGit(s, "write README.md changed\ngit add README.md\ngit commit -m saved");
  assert.match(runGit(s, "git log --oneline").lines[0].text, /saved/);
  runGit(s, "git init");
  assert.doesNotMatch(runGit(s, "git log --oneline").lines[0].text, /saved/);
});
