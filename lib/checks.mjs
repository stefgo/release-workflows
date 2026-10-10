// What has to hold between main and dev before either may release. Each check
// returns the tags that break its rule; the wording lives with the callers.

import { execFileSync } from "node:child_process";

export const STABLE_BRANCH = "main";
export const BETA_BRANCH = "dev";

const TAG = /^v(\d+)\.(\d+)\.(\d+)(-.+)?$/;

function parse(tag) {
    const match = TAG.exec(tag);
    return match && { tag, base: match.slice(1, 4).map(Number), prerelease: Boolean(match[4]) };
}

// Compares "1.2.3" or [1, 2, 3]; a prerelease suffix is ignored.
export function compareBase(a, b) {
    const [x, y] = [a, b].map((v) => (Array.isArray(v) ? v : v.split("-")[0].split(".").map(Number)));
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

function versionTags(cwd) {
    return execFileSync("git", ["tag", "--list", "v*"], { cwd, encoding: "utf8" })
        .split("\n")
        .map(parse)
        .filter(Boolean);
}

function isPartOfHead(cwd, tag) {
    try {
        execFileSync("git", ["merge-base", "--is-ancestor", tag, "HEAD"], { cwd, stdio: "ignore" });
        return true;
    } catch (error) {
        if (error.status === 1) return false;
        throw error;
    }
}

function highestStable(tags) {
    return tags.filter((t) => !t.prerelease).sort((a, b) => compareBase(b.base, a.base))[0];
}

// For dev. The release commit of a stable version is made on main; until main
// is merged back, dev does not know the version exists and would number its
// next beta below it. Returns the tag that is missing, or null.
export function stableMissingFromHead(cwd) {
    const stable = highestStable(versionTags(cwd));
    return stable && !isPartOfHead(cwd, stable.tag) ? stable.tag : null;
}

// For main. Betas newer than the last stable version that the current commit
// does not contain: dev was not merged, or it was squashed or rebased, which
// leaves the tagged commits behind. Each comes with its version without the
// suffix, because whether that is a fault depends on the version being released.
export function betasMissingFromHead(cwd) {
    const tags = versionTags(cwd);
    const stable = highestStable(tags);
    return tags
        .filter((t) => t.prerelease && (!stable || compareBase(t.base, stable.base) > 0))
        .filter((t) => !isPartOfHead(cwd, t.tag))
        .map((t) => ({ tag: t.tag, base: t.base.join(".") }));
}
