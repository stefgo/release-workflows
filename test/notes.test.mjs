import assert from "node:assert/strict";
import { test } from "node:test";
import lodash from "lodash-es";
import {
    changelogPreamble,
    composeNotes,
    dropPrereleaseSections,
    footerTemplate,
    handwritten,
    renderFooter,
} from "../lib/notes.mjs";

test("a file that holds only the template's comment is empty", () => {
    assert.equal(handwritten("<!--\nWrite below.\n-->\n\n"), "");
    assert.equal(handwritten("<!-- a -->\nNew: MQTT.\n<!-- b -->\n"), "New: MQTT.");
});

test("the hand-written part goes between the version heading and the commits", () => {
    const generated = "## [1.1.0](https://x/compare/v1.0.1...v1.1.0) (2026-10-10)\n\n### Features\n\n* a ([1](x))\n";
    assert.equal(
        composeNotes(generated, "New: MQTT."),
        "## [1.1.0](https://x/compare/v1.0.1...v1.1.0) (2026-10-10)\n\nNew: MQTT.\n\n### Features\n\n* a ([1](x))\n",
    );
});

test("a release without a listed commit still gets heading and text", () => {
    assert.equal(composeNotes("## 1.0.2 (2026-10-10)\n\n\n", "Rebuilt."), "## 1.0.2 (2026-10-10)\n\nRebuilt.\n");
});

test("the footer takes the version and the tag", () => {
    const footer = "<!-- hint -->\nghcr.io/x/y:{{version}}, {{tag}}\n";
    assert.equal(renderFooter(footer, { version: "1.2.0", gitTag: "v1.2.0" }), "ghcr.io/x/y:1.2.0, v1.2.0");
});

test("the footer template renders to the same text, delimiters included", () => {
    const footer = "Pull `x:{{version}}` ({{tag}}), set ${NPM_TOKEN} and <% nothing %>.";
    const nextRelease = { version: "1.2.0", gitTag: "v1.2.0" };
    assert.equal(lodash.template(footerTemplate(footer))({ nextRelease }), renderFooter(footer, nextRelease));
});

test("a stable release drops the entries of its betas from the changelog", () => {
    const changelog = [
        "## [1.1.0](x) (2026-10-12)",
        "",
        "Text.",
        "",
        "### Features",
        "",
        "## [1.1.0-beta.2](x) (2026-10-11)",
        "",
        "### Features",
        "",
        "## [1.1.0-beta.1](x) (2026-10-10)",
        "",
        "Text.",
        "",
        "## [1.0.1](x) (2026-10-01)",
        "",
        "# [1.0.0](x) (2026-09-01)",
        "",
        "## 0.0.1-rc.1 (2026-08-01)",
        "",
        "## 0.0.1 (2026-08-01)",
        "",
    ].join("\n");
    assert.equal(
        dropPrereleaseSections(changelog),
        [
            "## [1.1.0](x) (2026-10-12)",
            "",
            "Text.",
            "",
            "### Features",
            "",
            "## [1.0.1](x) (2026-10-01)",
            "",
            "# [1.0.0](x) (2026-09-01)",
            "",
            "## 0.0.1 (2026-08-01)",
            "",
        ].join("\n"),
    );
});

test("the preamble of a changelog is what stands before its first entry", () => {
    assert.equal(changelogPreamble("# Changelog\n\nThe format follows X.\n\n## [1.4.2] — 2026-10-10\n\nText.\n"), "# Changelog\n\nThe format follows X.");
    assert.equal(changelogPreamble("# Changelog\n\n## [Unreleased]\n\n## [1.0.0]\n"), "# Changelog");
});

test("a changelog that opens with an entry has no preamble", () => {
    assert.equal(changelogPreamble("## [1.0.1](x) (2026-10-10)\n\n### Bug Fixes\n"), "");
    assert.equal(changelogPreamble("# [1.7.0](x) (2026-10-10)\n\n### Features\n"), "");
});
