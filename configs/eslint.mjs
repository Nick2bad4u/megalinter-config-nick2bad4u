import nickTwoBadFourU from "eslint-config-nick2bad4u";

/** @type {import("eslint").Linter.Config[]} */
// MegaLinter runs native yamllint with yamllint-config-nick2bad4u. Use the
// owner's composition preset so ESLint does not register a duplicate YAML rule.
const config = nickTwoBadFourU.configs.withoutYamllint;

export default config;
