// The refusals, worded once for the preflight and for the plugin.

import { BETA_BRANCH, STABLE_BRANCH } from "./checks.mjs";

export const NOTES_FILE = ".release/next.md";
export const FOOTER_FILE = ".release/footer.md";

export function wrongBranch(branch) {
    return `A release is made on '${STABLE_BRANCH}' (stable) or '${BETA_BRANCH}' (beta), not on '${branch}'.`;
}

export function notesMissing() {
    return `${NOTES_FILE} holds no text. Every release needs its hand-written part: what is new, and what an upgrade needs.`;
}

export function stableNotMergedBack(tag) {
    return `${tag} was released from '${STABLE_BRANCH}' and is not part of '${BETA_BRANCH}'. Merge '${STABLE_BRANCH}' into '${BETA_BRANCH}' before releasing a beta, or the beta is numbered below a version that exists already.`;
}

export function betasNotMerged(tags, version) {
    return `${tags.join(", ")} ${tags.length === 1 ? "was" : "were"} released from '${BETA_BRANCH}' but ${tags.length === 1 ? "is" : "are"} not part of '${STABLE_BRANCH}', which is about to release ${version}. Merge '${BETA_BRANCH}' with its history (git merge ${BETA_BRANCH}); a squash or a rebase leaves the tagged commits behind.`;
}

export function betasAhead(tags) {
    return `${tags.join(", ")} ${tags.length === 1 ? "is" : "are"} not part of '${STABLE_BRANCH}'. That is right for a fix released ahead of '${BETA_BRANCH}', and wrong if '${BETA_BRANCH}' was meant to be in this release.`;
}
