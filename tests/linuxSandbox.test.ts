import test from "node:test";
import assert from "node:assert/strict";
import { linuxHelp, newLinuxSession, runLinux } from "../src/lib/linuxSandbox.ts";

test("inspects a simulated filesystem with predictable logs", () => {
  const s = newLinuxSession();
  const result = runLinux(s, "pwd\nls\nwc -l logs/app.log\ngrep -n ERROR logs/app.log");
  assert.equal(result.ok, true);
  assert.equal(result.lines[0].text, "/home/learner");
  assert.match(result.lines[1].text, /logs/);
  assert.equal(result.lines[2].text, "3");
  assert.match(result.lines[3].text, /2:2026-11-20 ERROR/);
  assert.match(result.lines[3].text, /3:2026-11-20 ERROR/);
});
test("creates virtual files and respects quoted arguments", () => {
  const s = newLinuxSession();
  const r = runLinux(s, "mkdir notes\nwrite notes/message.txt 'Hello Bash world'\ncat notes/message.txt\nfind notes");
  assert.equal(r.ok, true, JSON.stringify(r.lines));
  assert.equal(s.files["/home/learner/notes/message.txt"], "Hello Bash world\n");
  assert.ok(r.lines.some((line) => line.text === "Hello Bash world"));
});
test("does not execute real shell, scripts or host commands", () => {
  const s = newLinuxSession();
  const r = runLinux(s, "sudo cat /etc/passwd\ncat /etc/passwd\nls; rm -rf /");
  assert.equal(r.ok, false);
  assert.ok(r.lines.every((line) => line.name === "stderr"));
  assert.equal(s.cwd, "/home/learner");
  assert.equal(s.files["/etc/passwd"], undefined);
  assert.match(linuxHelp, /NOT a real Linux shell/);
});
test("session reset drops virtual edits; length limits protect the UI", () => {
  const s = newLinuxSession();
  assert.equal(runLinux(s, "touch example.txt").ok, true);
  assert.ok(Object.hasOwn(s.files, "/home/learner/example.txt"));
  assert.equal(newLinuxSession().files["/home/learner/example.txt"], undefined);
  assert.equal(runLinux(s, "pwd\n".repeat(45)).ok, false);
  assert.equal(runLinux(s, "a".repeat(10001)).ok, false);
});

