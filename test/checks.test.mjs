import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { betasMissingFromHead, compareBase, stableMissingFromHead } from "../lib/checks.mjs";

let cwd;
const git = (...args) => execFileSync("git", args, { cwd, stdio: "pipe" });
const commit = (message) => git("commit", "--allow-empty", "-m", message);

// main with v1.0.0, and dev one feature ahead of it, released as a beta.
beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "release-checks-"));
    git("init", "-b", "main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    git("config", "commit.gpgsign", "false");
    commit("feat: First");
    git("tag", "v1.0.0");
    git("checkout", "-b", "dev");
    commit("feat: Second");
    git("tag", "v1.1.0-beta.1");
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

test("versions compare by number, with or without a suffix", () => {
    assert.ok(compareBase("1.10.0", "1.9.0") > 0);
    assert.equal(compareBase("1.1.0", "1.1.0-beta.2"), 0);
    assert.ok(compareBase([1, 0, 1], "1.1.0") < 0);
});

test("dev that has every stable version may release", () => {
    assert.equal(stableMissingFromHead(cwd), null);
});

test("dev that lacks the release commit of main is named the tag", () => {
    git("checkout", "main");
    commit("chore(release): 1.0.1");
    git("tag", "v1.0.1");
    git("checkout", "dev");
    assert.equal(stableMissingFromHead(cwd), "v1.0.1");
    git("merge", "main", "-m", "Merge branch 'main' into dev");
    assert.equal(stableMissingFromHead(cwd), null);
});

test("main that merged dev with its history contains the beta", () => {
    git("checkout", "main");
    git("merge", "--no-ff", "dev", "-m", "Merge branch 'dev'");
    assert.deepEqual(betasMissingFromHead(cwd), []);
});

test("main that squashed dev does not contain the beta", () => {
    git("checkout", "main");
    git("merge", "--squash", "dev");
    // Not the message of the commit on dev: two empty commits with the same
    // parent, author, second and message are one and the same commit.
    commit("feat: Second, squashed");
    assert.deepEqual(betasMissingFromHead(cwd), [{ tag: "v1.1.0-beta.1", base: "1.1.0" }]);
});

test("a beta of a version that is released by now is no longer asked for", () => {
    git("checkout", "main");
    git("merge", "--squash", "dev");
    commit("feat: Second, squashed");
    git("tag", "v1.1.0");
    assert.deepEqual(betasMissingFromHead(cwd), []);
});
