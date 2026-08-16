import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const npmCli = process.env.npm_execpath;
if (typeof npmCli !== "string") {
    throw new TypeError("Run the packed-consumer verifier through npm");
}
const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "megalinter-config-consumer-")
);

try {
    const pack = await run(
        process.execPath,
        [
            npmCli,
            "pack",
            "--json",
            "--ignore-scripts",
            "--pack-destination",
            temporaryRoot,
        ],
        { maxBuffer: 10 * 1024 * 1024 }
    );
    const rawMetadata = JSON.parse(pack.stdout);
    const metadata = Array.isArray(rawMetadata)
        ? rawMetadata
        : Object.values(rawMetadata);
    assert.equal(
        metadata.length,
        1,
        "npm pack should produce exactly one package"
    );
    const tarballPath = path.join(temporaryRoot, metadata[0].filename);

    const consumerRoot = temporaryRoot;
    await writeFile(
        path.join(temporaryRoot, "package.json"),
        `${JSON.stringify(
            {
                allowScripts: [],
                devDependencies: {
                    "megalinter-config-nick2bad4u": `file:${tarballPath}`,
                },
                name: "packed-consumer",
                private: true,
                type: "module",
            },
            null,
            2
        )}\n`
    );
    const consumerNpmrc = path.join(temporaryRoot, ".npmrc");
    await writeFile(consumerNpmrc, "strict-allow-scripts=true\n");
    const consumerEnv = Object.fromEntries(
        Object.entries(process.env).filter(
            ([name]) => name.toLowerCase() !== "npm_config_allow_scripts"
        )
    );
    consumerEnv.NPM_CONFIG_USERCONFIG = consumerNpmrc;
    await run(
        process.execPath,
        [
            npmCli,
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            "--package-lock=false",
        ],
        {
            cwd: temporaryRoot,
            env: consumerEnv,
            maxBuffer: 20 * 1024 * 1024,
        }
    );

    await writeFile(
        path.join(temporaryRoot, "verify.mjs"),
        `
            import assert from "node:assert/strict";
            import { access, readFile } from "node:fs/promises";
            import configUrl, { resolveConfig } from "megalinter-config-nick2bad4u";
            import eslintConfig from "megalinter-config-nick2bad4u/configs/eslint.mjs";
            import prettierConfig from "megalinter-config-nick2bad4u/configs/prettier.config.mjs";
            import remarkConfig from "megalinter-config-nick2bad4u/configs/remark.config.mjs";
            import stylelintConfig from "megalinter-config-nick2bad4u/configs/stylelint.config.mjs";
            import packagePolicy from "megalinter-config-nick2bad4u/configs/npm-package-json-lint.config.cjs";
            import secretPolicy from "megalinter-config-nick2bad4u/configs/secretlint.config.cjs";

            await access(configUrl);
            await access(resolveConfig("generated/cspell/cspell.json"));
            assert.match(await readFile(configUrl, "utf8"), /ENABLE_LINTERS:/u);
            assert.ok(Array.isArray(eslintConfig) && eslintConfig.length > 50);
            assert.equal(typeof prettierConfig, "object");
            assert.equal(typeof remarkConfig, "object");
            assert.equal(typeof stylelintConfig, "object");
            assert.equal(typeof packagePolicy, "object");
            assert.ok(Array.isArray(secretPolicy.rules) && secretPolicy.rules.length > 5);
        `
    );
    await run(process.execPath, [path.join(temporaryRoot, "verify.mjs")], {
        cwd: consumerRoot,
        maxBuffer: 20 * 1024 * 1024,
    });

    const packageJson = JSON.parse(
        await readFile(
            path.join(
                temporaryRoot,
                "node_modules",
                "megalinter-config-nick2bad4u",
                "package.json"
            ),
            "utf8"
        )
    );
    assert.equal(packageJson.version, metadata[0].version);
    console.log(
        `Packed consumer verified ${packageJson.name}@${packageJson.version}.`
    );
} finally {
    await rm(temporaryRoot, { force: true, recursive: true });
}
