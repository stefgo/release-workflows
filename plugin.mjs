// The part of a release that semantic-release has no plugin for: the forced
// version step, the hand-written notes, and the rules between main and dev.
// Listed in release.config.mjs after @semantic-release/changelog and before
// @semantic-release/git -- `prepare` edits the changelog the first has written
// and leaves it for the second to commit.

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import SemanticReleaseError from "@semantic-release/error";
import { generateNotes as generateCommitNotes } from "@semantic-release/release-notes-generator";
import { betasMissingFromHead, compareBase, stableMissingFromHead } from "./lib/checks.mjs";
import { composeNotes, dropPrereleaseSections, handwritten, renderFooter } from "./lib/notes.mjs";
import * as messages from "./lib/messages.mjs";

const TEMPLATE = fileURLToPath(new URL("./templates/next.md", import.meta.url));
const STEPS = ["patch", "minor", "major"];

function read(cwd, file) {
    const path = join(cwd, file);
    return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function refuse(code, message) {
    // The annotation is what the run's summary page shows; the error is what
    // stops semantic-release.
    console.log(`::error::${message}`);
    return new SemanticReleaseError(message, code);
}

export async function verifyConditions(_config, { cwd, branch }) {
    if (!handwritten(read(cwd, messages.NOTES_FILE))) {
        throw refuse("ENOTES", messages.notesMissing());
    }
    if (branch.prerelease) {
        const tag = stableMissingFromHead(cwd);
        if (tag) throw refuse("ENOTMERGEDBACK", messages.stableNotMergedBack(tag));
    }
}

// With a step chosen by hand, release.config.mjs leaves the commit analyzer
// out: semantic-release takes the highest answer of all analyzers, so next to
// it a chosen "patch" could never undercut what the commits call for.
export async function analyzeCommits({ bump }) {
    return STEPS.includes(bump) ? bump : undefined;
}

export async function verifyRelease(_config, { cwd, branch, nextRelease, logger }) {
    if (branch.prerelease) return;
    const missing = betasMissingFromHead(cwd);
    const covered = missing.filter(({ base }) => compareBase(base, nextRelease.version) <= 0);
    if (covered.length > 0) {
        throw refuse("EBETASNOTMERGED", messages.betasNotMerged(covered.map((b) => b.tag), nextRelease.version));
    }
    if (missing.length > 0) {
        const warning = messages.betasAhead(missing.map((b) => b.tag));
        console.log(`::warning::${warning}`);
        logger.warn(warning);
    }
}

export async function generateNotes({ notes: notesConfig, bump }, context) {
    const { cwd, env, branch, nextRelease, options } = context;
    const commits = await generateCommitNotes(notesConfig, context);
    const notes = composeNotes(commits, handwritten(read(cwd, messages.NOTES_FILE)));

    if (env.GITHUB_STEP_SUMMARY) {
        const footer = renderFooter(read(cwd, messages.FOOTER_FILE), nextRelease);
        const summary = [
            options.dryRun ? `# Dry run: ${nextRelease.gitTag}` : `# ${nextRelease.gitTag}`,
            options.dryRun ? "Nothing was committed, tagged or published." : "",
            `Branch \`${branch.name}\`, version step \`${bump}\` (${nextRelease.type}).`,
            "---",
            notes,
            footer,
        ];
        appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary.filter(Boolean).join("\n\n")}\n`);
    }
    // Written in a dry run as well, unlike the tag: it tells the workflow
    // that a version was found at all.
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `next=${nextRelease.gitTag}\n`);
    return notes;
}

// A beta leaves both files alone: its notes are the draft of the stable
// release, and its changelog entry is what the next beta is read against.
export async function prepare(_config, { cwd, branch }) {
    if (branch.prerelease) return;
    writeFileSync(join(cwd, messages.NOTES_FILE), readFileSync(TEMPLATE, "utf8"));
    const changelog = join(cwd, "CHANGELOG.md");
    if (existsSync(changelog)) {
        writeFileSync(changelog, dropPrereleaseSections(readFileSync(changelog, "utf8")));
    }
}

// Does not run in a dry run, so an empty output means "nothing was released".
export async function success(_config, { env, nextRelease }) {
    if (env.GITHUB_OUTPUT) {
        appendFileSync(env.GITHUB_OUTPUT, `tag=${nextRelease.gitTag}\nversion=${nextRelease.version}\n`);
    }
}
