// The semantic-release configuration of every stefgo project, passed with
// --extends by .github/workflows/release.yml. A project carries no
// configuration of its own; what differs between projects arrives as RELEASE_*
// variables from the inputs of that workflow.
//
// semantic-release is started inside the project, so relative paths here are
// the project's.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BETA_BRANCH, STABLE_BRANCH } from "./lib/checks.mjs";
import { FOOTER_FILE, NOTES_FILE } from "./lib/messages.mjs";
import { footerTemplate } from "./lib/notes.mjs";

const { RELEASE_BUMP: bump = "auto", RELEASE_BREAKING: breaking = "minor", RELEASE_NPM_PUBLISH: npmPublish } = process.env;

if (!["auto", "patch", "minor", "major"].includes(bump)) {
    throw new Error(`RELEASE_BUMP is '${bump}'; expected auto, patch, minor or major.`);
}
if (!["minor", "major"].includes(breaking)) {
    throw new Error(`RELEASE_BREAKING is '${breaking}'; expected minor or major.`);
}

const plugin = fileURLToPath(new URL("./plugin.mjs", import.meta.url));
const footer = existsSync(FOOTER_FILE) ? footerTemplate(readFileSync(FOOTER_FILE, "utf8")) : "";

// The sections of the generated list, in the order they appear. A type that is
// not listed is left out of the notes; it still counts for the version if the
// analyzer says so.
const sections = [
    { type: "feat", section: "Features" },
    { type: "fix", section: "Bug Fixes" },
    { type: "perf", section: "Performance" },
    { type: "revert", section: "Reverts" },
    { type: "build", scope: "deps", section: "Dependencies" },
];

export default {
    branches: [STABLE_BRANCH, { name: BETA_BRANCH, prerelease: "beta" }],
    plugins: [
        // feat raises the minor position, fix, perf and revert the patch
        // position. An application reserves the major position for a decision
        // (bump: major) and lets a BREAKING CHANGE footer raise the minor one; a
        // library keeps the default, where the footer raises the major position.
        ...(bump === "auto"
            ? [
                  [
                      "@semantic-release/commit-analyzer",
                      { releaseRules: breaking === "minor" ? [{ breaking: true, release: "minor" }] : [] },
                  ],
              ]
            : []),
        "@semantic-release/changelog",
        ...(existsSync("package.json")
            ? [["@semantic-release/npm", { npmPublish: npmPublish === "true" }]]
            : []),
        [plugin, { bump, notes: { preset: "conventionalcommits", presetConfig: { types: sections } } }],
        [
            "@semantic-release/git",
            {
                assets: ["CHANGELOG.md", "package.json", "package-lock.json", NOTES_FILE],
                message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
            },
        ],
        [
            "@semantic-release/github",
            // The footer belongs to the release page alone: repeated under every
            // version of CHANGELOG.md it would only be noise.
            { releaseBodyTemplate: `<%= nextRelease.notes %>${footer ? `\n\n${footer}` : ""}` },
        ],
    ],
};
