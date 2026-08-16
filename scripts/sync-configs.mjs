import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);
const generatedRoot = path.join(repositoryRoot, "configs", "generated");
const checkOnly = process.argv.includes("--check");

/**
 * @typedef {(source: string) => string} ConfigTransform
 */

/** @type {(readonly [string, string, string, ConfigTransform?])[]} */
const fileMappings = [
    [
        "checkov-config-nick2bad4u",
        ".checkov.yml",
        "checkov.yml",
    ],
    [
        "devskim-config-nick2bad4u",
        ".devskim.json",
        "devskim.json",
        (source) => {
            const config = JSON.parse(source);
            assert.ok(Array.isArray(config.Globs));
            for (const excludedPath of [
                "**/configs/generated/secretlint.config",
                "**/package-lock.json",
            ]) {
                if (!config.Globs.includes(excludedPath)) {
                    config.Globs.push(excludedPath);
                }
            }
            return `${JSON.stringify(config, null, 4)}\n`;
        },
    ],
    [
        "gitleaks-config-nick2bad4u",
        "gitleaks.toml",
        "gitleaks.toml",
    ],
    [
        "grype-config-nick2bad4u",
        ".grype.yaml",
        "grype.yaml",
    ],
    [
        "htmlhint-config-nick2bad4u",
        ".htmlhintrc",
        "htmlhint.json",
    ],
    [
        "jscpd-config-nick2bad4u",
        "jscpd.json",
        "jscpd.json",
    ],
    [
        "kics-config-nick2bad4u",
        "kics.yaml",
        "kics.yaml",
    ],
    [
        "lychee-config-nick2bad4u",
        "lychee.toml",
        "lychee.toml",
    ],
    [
        "markdown-link-check-config-nick2bad4u",
        ".markdown-link-check.json",
        "markdown-link-check.json",
    ],
    [
        "markdownlint-config-nick2bad4u",
        "markdownlint.json",
        "markdownlint.json",
    ],
    [
        "secretlint-config-nick2bad4u",
        ".secretlintrc.json",
        "secretlint.config",
    ],
    [
        "yamllint-config-nick2bad4u",
        "yamllint.yaml",
        "yamllint.yaml",
    ],
];

/** @type {(readonly [string, string, string, readonly string[]])[]} */
const directoryMappings = [
    [
        "cspell-config-nick2bad4u",
        ".",
        "cspell",
        [
            "cspell.json",
            "dictionaries",
            "presets",
        ],
    ],
];

/**
 * @param {string} packageName
 *
 * @returns {string}
 */
function packageRoot(packageName) {
    let current = path.dirname(fileURLToPath(import.meta.resolve(packageName)));
    while (current !== path.dirname(current)) {
        const manifestPath = path.join(current, "package.json");
        if (existsSync(manifestPath)) {
            const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
            if (manifest.name === packageName) {
                return current;
            }
        }
        current = path.dirname(current);
    }
    throw new Error(`Unable to locate package root for ${packageName}`);
}

/**
 * @param {string} root
 *
 * @returns {Promise<string[]>}
 */
async function filesBelow(root) {
    const entries = await readdir(root, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
        const entryPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            for (const nested of await filesBelow(entryPath)) {
                results.push(path.join(entry.name, nested));
            }
        } else {
            results.push(entry.name);
        }
    }
    return results.sort((left, right) => left.localeCompare(right));
}

/**
 * @param {string} source
 * @param {string} target
 */
async function assertSameFile(source, target) {
    const [sourceBytes, targetBytes] = await Promise.all([
        readFile(source),
        readFile(target),
    ]);
    assert.deepEqual(
        targetBytes,
        sourceBytes,
        `${path.relative(repositoryRoot, target)} is stale`
    );
}

if (!checkOnly) {
    await rm(generatedRoot, { force: true, recursive: true });
    await mkdir(generatedRoot, { recursive: true });
}

for (const [
    packageName,
    sourceRelative,
    targetRelative,
    transform,
] of fileMappings) {
    const source = path.join(packageRoot(packageName), sourceRelative);
    const target = path.join(generatedRoot, targetRelative);
    if (checkOnly) {
        if (transform === undefined) {
            await assertSameFile(source, target);
        } else {
            assert.equal(
                await readFile(target, "utf8"),
                transform(await readFile(source, "utf8")),
                `${path.relative(repositoryRoot, target)} is stale`
            );
        }
    } else {
        await mkdir(path.dirname(target), { recursive: true });
        if (transform === undefined) {
            await cp(source, target);
        } else {
            await writeFile(target, transform(await readFile(source, "utf8")));
        }
    }
}

for (const [
    packageName,
    sourceRelative,
    targetRelative,
    entries,
] of directoryMappings) {
    const sourceRoot = path.join(packageRoot(packageName), sourceRelative);
    const targetRoot = path.join(generatedRoot, targetRelative);
    if (!checkOnly) {
        await mkdir(targetRoot, { recursive: true });
    }
    for (const entry of entries) {
        const source = path.join(sourceRoot, entry);
        const target = path.join(targetRoot, entry);
        if (checkOnly) {
            const sourceFiles = (
                await filesBelow(source).catch(() => [""])
            ).map((file) => path.join(entry, file));
            const targetFiles = (
                await filesBelow(target).catch(() => [""])
            ).map((file) => path.join(entry, file));
            assert.deepEqual(
                targetFiles,
                sourceFiles,
                `${targetRelative}/${entry} inventory is stale`
            );
            for (const relativeFile of sourceFiles) {
                await assertSameFile(
                    path.join(sourceRoot, relativeFile),
                    path.join(targetRoot, relativeFile)
                );
            }
        } else {
            await cp(source, target, { recursive: true });
        }
    }
}

console.log(
    checkOnly
        ? "Generated configs are synchronized."
        : "Generated configs synchronized."
);
