import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Ajv } from "ajv";
import { parse } from "yaml";

const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);
const schemaUrl =
    "https://raw.githubusercontent.com/oxsecurity/megalinter/main/megalinter/descriptors/schemas/megalinter-configuration.jsonschema.json";
const packagePrefix = "node_modules/megalinter-config-nick2bad4u/";

/**
 * @typedef {object} MegaLinterSchema
 *
 * @property {Record<string, { deprecated?: boolean }>} properties
 * @property {{ enum_linter_keys: { enum: string[] } }} definitions
 */

const configPathKeys = [
    "ACTION_ACTIONLINT_CONFIG_FILE",
    "COPYPASTE_JSCPD_CONFIG_FILE",
    "CSS_STYLELINT_CONFIG_FILE",
    "HTML_HTMLHINT_CONFIG_FILE",
    "JAVASCRIPT_ES_CONFIG_FILE",
    "JAVASCRIPT_PRETTIER_CONFIG_FILE",
    "JSON_NPM_PACKAGE_JSON_LINT_CONFIG_FILE",
    "JSON_PRETTIER_CONFIG_FILE",
    "JSX_ESLINT_CONFIG_FILE",
    "MARKDOWN_MARKDOWNLINT_CONFIG_FILE",
    "REPOSITORY_CHECKOV_CONFIG_FILE",
    "REPOSITORY_DEVSKIM_CONFIG_FILE",
    "REPOSITORY_GRYPE_CONFIG_FILE",
    "REPOSITORY_SECRETLINT_CONFIG_FILE",
    "SPELL_CSPELL_CONFIG_FILE",
    "SPELL_LYCHEE_CONFIG_FILE",
    "TSX_ESLINT_CONFIG_FILE",
    "TYPESCRIPT_ES_CONFIG_FILE",
    "TYPESCRIPT_PRETTIER_CONFIG_FILE",
    "YAML_PRETTIER_CONFIG_FILE",
    "YAML_YAMLLINT_CONFIG_FILE",
];

/**
 * @param {string} relativePath
 *
 * @returns {Promise<Record<string, unknown>>}
 */
async function loadYaml(relativePath) {
    return /** @type {Record<string, unknown>} */ (
        parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"))
    );
}

const response = await fetch(schemaUrl, {
    signal: AbortSignal.timeout(30_000),
});
assert.equal(
    response.ok,
    true,
    `Unable to download MegaLinter schema: HTTP ${response.status}`
);
const schema = /** @type {MegaLinterSchema & Record<string, unknown>} */ (
    await response.json()
);

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addFormat("uri", true);
const validate = ajv.compile(schema);

const shared = await loadYaml("megalinter-shared.yml");
const local = await loadYaml(".mega-linter.yml");

/** @type {(readonly [string, Record<string, unknown>])[]} */
const configs = [
    ["megalinter-shared.yml", shared],
    [".mega-linter.yml", local],
];

for (const [name, config] of configs) {
    if (!validate(config)) {
        const details = ajv.errorsText(validate.errors, {
            dataVar: name,
            separator: "\n",
        });
        throw new Error(`MegaLinter schema validation failed:\n${details}`);
    }

    for (const key of Object.keys(config)) {
        assert.equal(
            schema.properties[key]?.deprecated,
            undefined,
            `${name} uses deprecated MegaLinter property ${key}`
        );
    }
}

assert.equal(local.EXTENDS, "megalinter-shared.yml");
assert.equal(shared.EXTENDS, undefined);
assert.equal(
    shared.APPLY_FIXES,
    "none",
    "Shared config must not mutate consumer sources by default"
);
assert.equal(
    shared.DISABLE_ERRORS,
    false,
    "Shared config must fail on linter errors"
);
assert.equal(
    shared.FORMATTERS_DISABLE_ERRORS,
    false,
    "Formatter failures must be blocking"
);
assert.equal(
    shared.PLUGINS,
    undefined,
    "Third-party plugins must be explicit consumer opt-ins"
);

const enabledLinters = shared.ENABLE_LINTERS;
assert.ok(Array.isArray(enabledLinters));
assert.equal(
    new Set(enabledLinters).size,
    enabledLinters.length,
    "ENABLE_LINTERS has duplicates"
);
const knownLinters = new Set(schema.definitions.enum_linter_keys.enum);
for (const linter of enabledLinters) {
    assert.ok(knownLinters.has(linter), `Unknown enabled linter ${linter}`);
}
for (const retired of [
    "MARKDOWN_MARKDOWN_LINK_CHECK",
    "MARKDOWN_REMARK_LINT",
    "REPOSITORY_KICS",
    "TERRAFORM_CHECKOV",
]) {
    assert.ok(
        !enabledLinters.includes(retired),
        `Retired MegaLinter integration ${retired} is enabled`
    );
}

for (const key of configPathKeys) {
    const publishedPath = shared[key];
    const localPath = local[key];
    if (typeof publishedPath !== "string" || typeof localPath !== "string") {
        throw new TypeError(`${key} is missing from shared or local config`);
    }
    assert.ok(
        publishedPath.startsWith(packagePrefix),
        `${key} is not package-relative`
    );
    assert.equal(
        localPath,
        publishedPath.slice(packagePrefix.length),
        `${key} local path drifted`
    );
    await access(path.join(repositoryRoot, localPath));
}

for (const compatibilityAsset of [
    "configs/generated/gitleaks.toml",
    "configs/generated/kics.yaml",
    "configs/generated/markdown-link-check.json",
    "configs/remark.config.mjs",
]) {
    await access(path.join(repositoryRoot, compatibilityAsset));
}

console.log(
    `Validated two MegaLinter configs, ${enabledLinters.length} enabled linters, and ${configPathKeys.length} shared/local path mappings.`
);
