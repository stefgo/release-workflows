import assert from "node:assert/strict";
import { test } from "node:test";
import { list, setVersion } from "../lib/version.mjs";

test("a manifest gets its one version, formatting untouched", () => {
    const text = '{\n  "domain": "x",\n  "version": "1.4.2"\n}\n';
    assert.equal(setVersion("custom_components/x/manifest.json", text, "1.5.0-beta.1"), '{\n  "domain": "x",\n  "version": "1.5.0-beta.1"\n}\n');
});

test("a lockfile gets its own two versions and no dependency's", () => {
    const text = '{"name":"c","version": "1.0.0","packages":{"":{"version": "1.0.0"},"node_modules/a":{"version": "3.2.1"}}}';
    assert.equal(
        setVersion("card/package-lock.json", text, "1.1.0"),
        '{"name":"c","version": "1.1.0","packages":{"":{"version": "1.1.0"},"node_modules/a":{"version": "3.2.1"}}}',
    );
});

test("a file without a version is refused", () => {
    assert.throws(() => setVersion("hacs.json", '{"name": "x"}', "1.0.0"), /holds 0 "version" key/);
});

test("a list from a workflow input is split on any whitespace", () => {
    assert.deepEqual(list(" a.json\n  b/c.json  d "), ["a.json", "b/c.json", "d"]);
    assert.deepEqual(list(undefined), []);
});
