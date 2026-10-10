#!/usr/bin/env node
// What can be said about a release before any check has run: the branch, the
// hand-written notes, and whether dev knows the last stable version. Needs
// nothing installed. plugin.mjs asks the same questions again, because it is
// the one that actually releases.

import { existsSync, readFileSync } from "node:fs";
import { BETA_BRANCH, STABLE_BRANCH, stableMissingFromHead } from "./lib/checks.mjs";
import { handwritten } from "./lib/notes.mjs";
import * as messages from "./lib/messages.mjs";

const cwd = process.cwd();
const branch = process.env.GITHUB_REF_NAME;
const refusals = [];

if (branch !== STABLE_BRANCH && branch !== BETA_BRANCH) {
    refusals.push(messages.wrongBranch(branch));
} else {
    const notes = existsSync(messages.NOTES_FILE) ? readFileSync(messages.NOTES_FILE, "utf8") : "";
    if (!handwritten(notes)) refusals.push(messages.notesMissing());
    if (branch === BETA_BRANCH) {
        const tag = stableMissingFromHead(cwd);
        if (tag) refusals.push(messages.stableNotMergedBack(tag));
    }
}

for (const refusal of refusals) console.log(`::error::${refusal}`);
process.exit(refusals.length > 0 ? 1 : 0);
