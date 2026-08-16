import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { configsUrl, configUrl, resolveConfig } from "../preset.mjs";

const require = createRequire(import.meta.url);
const repositoryRoot = path.resolve(import.meta.dirname, "..");

describe("configuration package", () => {
    it("public API resolves packaged files", async () => {
        expect.hasAssertions();
        expect(configUrl.protocol).toBe("file:");
        expect(configUrl.pathname.endsWith("/megalinter-shared.yml")).toBe(
            true
        );
        expect(configsUrl.pathname.endsWith("/configs/")).toBe(true);

        await expect(access(configUrl)).resolves.toBeUndefined();
        await expect(
            access(resolveConfig("generated/yamllint.yaml"))
        ).resolves.toBeUndefined();

        const devSkim = /** @type {{ Globs: string[] }} */ (
            JSON.parse(
                await readFile(resolveConfig("generated/devskim.json"), "utf8")
            )
        );
        const secretlint = /** @type {{ rules: unknown[] }} */ (
            JSON.parse(
                await readFile(
                    resolveConfig("generated/secretlint.config"),
                    "utf8"
                )
            )
        );

        expect(devSkim.Globs).toContain("**/package-lock.json");
        expect(secretlint.rules.length).toBeGreaterThan(5);
    });

    it("missing public config paths remain observable", async () => {
        expect.hasAssertions();

        await expect(
            access(resolveConfig("generated/not-a-real-config.json"))
        ).rejects.toMatchObject({
            code: "ENOENT",
        });
    });

    it("javascript wrappers load their shared presets", async () => {
        expect.hasAssertions();

        const [
            { default: eslint },
            { default: prettier },
            { default: remark },
            { default: stylelint },
        ] = await Promise.all([
            import("../configs/eslint.mjs"),
            import("../configs/prettier.config.mjs"),
            import("../configs/remark.config.mjs"),
            import("../configs/stylelint.config.mjs"),
        ]);

        expect(Array.isArray(eslint)).toBe(true);
        expect(eslint.length).toBeGreaterThan(50);
        expect(prettier).toBeTypeOf("object");
        expect(remark).toBeTypeOf("object");
        expect(stylelint).toBeTypeOf("object");
    }, 30_000);

    it("commonjs wrappers load package and secret policies", () => {
        expect.hasAssertions();

        /** @type {Record<string, unknown>} */
        const packagePolicy = require("../configs/npm-package-json-lint.config.cjs");
        /** @type {{ rules: unknown[] }} */
        const secretPolicy = require("../configs/secretlint.config.cjs");

        expect(packagePolicy).toBeTypeOf("object");
        expect(secretPolicy.rules.length).toBeGreaterThan(5);
    });

    it("local config extends the publishable base", async () => {
        expect.hasAssertions();

        /** @type {Record<string, unknown>} */
        const shared = parse(
            await readFile(
                path.join(repositoryRoot, "megalinter-shared.yml"),
                "utf8"
            )
        );
        /** @type {Record<string, unknown>} */
        const local = parse(
            await readFile(
                path.join(repositoryRoot, ".mega-linter.yml"),
                "utf8"
            )
        );

        expect(local.EXTENDS).toBe("megalinter-shared.yml");
        expect(shared.EXTENDS).toBeUndefined();
        expect(shared.DISABLE_ERRORS).toBe(false);
        expect(shared.PLUGINS).toBeUndefined();
    });
});
