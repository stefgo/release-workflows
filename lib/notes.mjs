// The text side of a release: the hand-written part, the generated list of
// commits, the footer, and the changelog. Pure functions, no file access.

// The template explains itself in an HTML comment. A comment is never
// published, and a file that holds nothing else counts as empty.
export function handwritten(text) {
    return text.replace(/<!--[\s\S]*?-->/g, "").trim();
}

// The generated notes open with the heading of the version. The hand-written
// part goes right below it and above the commits, so that in CHANGELOG.md it
// belongs to its own version and not to the one before.
export function composeNotes(generated, written) {
    const text = generated.trim();
    const end = text.indexOf("\n");
    const heading = end === -1 ? text : text.slice(0, end);
    const commits = end === -1 ? "" : text.slice(end + 1).trim();
    return `${[heading, written, commits].filter(Boolean).join("\n\n")}\n`;
}

const FIELDS = { "{{version}}": "version", "{{tag}}": "gitTag" };

// The footer of a project, with {{version}} and {{tag}} filled in.
export function renderFooter(text, nextRelease) {
    return handwritten(text).replace(/\{\{(?:version|tag)\}\}/g, (name) => nextRelease[FIELDS[name]]);
}

// The same footer as a lodash template, which is what @semantic-release/github
// takes for the body of a release. Whatever lodash would read as a delimiter
// becomes a literal, so a footer may contain "${...}" or "<%".
export function footerTemplate(text) {
    return handwritten(text).replace(/\{\{(?:version|tag)\}\}|<%|\$\{/g, (token) =>
        FIELDS[token] ? `<%= nextRelease.${FIELDS[token]} %>` : `<%= ${JSON.stringify(token)} %>`,
    );
}

// "## [1.2.0-beta.1](…) (2026-10-10)", "# [1.0.0](…)", "## 1.0.0 (…)".
const VERSION_HEADING = /^#{1,2} \[?(\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?)\]?[\s(]/;

// A stable release describes everything since the last stable one, so the
// entries of the betas that led to it say the same thing a second time. They
// are dropped from the changelog; the betas stay on the releases page.
export function dropPrereleaseSections(changelog) {
    let dropping = false;
    const kept = [];
    for (const line of changelog.split("\n")) {
        const heading = VERSION_HEADING.exec(line);
        if (heading) dropping = Boolean(heading[2]);
        if (!dropping) kept.push(line);
    }
    return kept.join("\n");
}
