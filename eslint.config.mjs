import config from "./configs/eslint.mjs";

/** @type {import("eslint").Linter.Config[]} */
const localConfig = config.map((entry) => {
    const parserOptions = /** @type {Record<string, unknown> | undefined} */ (
        entry.languageOptions?.parserOptions
    );
    if (parserOptions?.projectService === undefined) {
        return entry;
    }

    return {
        ...entry,
        languageOptions: {
            ...entry.languageOptions,
            parserOptions: {
                ...parserOptions,
                projectService: {
                    allowDefaultProject: [
                        ".remarkrc.mjs",
                        "eslint.config.mjs",
                        "prettier.config.mjs",
                        "stylelint.config.mjs",
                        "vitest.config.mjs",
                    ],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    };
});

export default localConfig;
