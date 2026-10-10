// Version numbers in files semantic-release has no plugin for, such as the
// manifest.json of a Home Assistant integration.

const VERSION_KEY = /("version":\s*")([^"]*)(")/g;

// A lockfile names the project's version twice: at the top level and again
// under packages[""]. Every other file names it once.
function ownVersionKeys(path) {
    return path.endsWith("package-lock.json") ? 2 : 1;
}

// Sets the project's own "version" in the text of a JSON file. The text is
// edited, not parsed and written again, so its formatting survives. Refuses a
// file that does not hold the keys, because writing nothing would release a
// version the file does not carry.
export function setVersion(path, text, version) {
    const wanted = ownVersionKeys(path);
    let seen = 0;
    const result = text.replace(VERSION_KEY, (match, before, _old, after) =>
        ++seen <= wanted ? `${before}${version}${after}` : match,
    );
    if (seen < wanted) {
        throw new Error(`${path} holds ${seen} "version" key(s); expected at least ${wanted}.`);
    }
    return result;
}

// "a b\nc" -> ["a", "b", "c"]: how a list arrives from a workflow input.
export function list(value) {
    return (value ?? "").split(/\s+/).filter(Boolean);
}
