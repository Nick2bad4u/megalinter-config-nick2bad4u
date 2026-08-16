const packageRoot = new URL("./", import.meta.url);

/** URL for the publishable MegaLinter base configuration. */
export const configUrl = new URL("megalinter-shared.yml", packageRoot);

/** URL for the directory containing bundled linter configurations. */
export const configsUrl = new URL("configs/", packageRoot);

/**
 * Resolve a bundled config path relative to the package's configs directory.
 *
 * @param {string} relativePath Config path below `configs/`.
 */
export function resolveConfig(relativePath) {
    return new URL(relativePath, configsUrl);
}

export default configUrl;
