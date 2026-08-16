# megalinter-config-nick2bad4u

[![NPM license.](https://flat.badgen.net/npm/license/megalinter-config-nick2bad4u?color=purple)](https://github.com/Nick2bad4u/megalinter-config-nick2bad4u/blob/main/LICENSE) [![NPM total downloads.](https://flat.badgen.net/npm/dt/megalinter-config-nick2bad4u?color=pink)](https://www.npmjs.com/package/megalinter-config-nick2bad4u) [![Latest GitHub release.](https://flat.badgen.net/github/release/Nick2bad4u/megalinter-config-nick2bad4u?color=cyan)](https://github.com/Nick2bad4u/megalinter-config-nick2bad4u/releases) [![GitHub stars.](https://flat.badgen.net/github/stars/Nick2bad4u/megalinter-config-nick2bad4u?color=yellow)](https://github.com/Nick2bad4u/megalinter-config-nick2bad4u/stargazers) [![GitHub forks.](https://flat.badgen.net/github/forks/Nick2bad4u/megalinter-config-nick2bad4u?color=orange)](https://github.com/Nick2bad4u/megalinter-config-nick2bad4u/forks) [![GitHub open issues.](https://flat.badgen.net/github/open-issues/Nick2bad4u/megalinter-config-nick2bad4u?color=red)](https://github.com/Nick2bad4u/megalinter-config-nick2bad4u/issues) [![Codecov.](https://flat.badgen.net/codecov/github/Nick2bad4u/megalinter-config-nick2bad4u?color=blue)](https://codecov.io/gh/Nick2bad4u/megalinter-config-nick2bad4u) [![Repo Checks.](https://flat.badgen.net/github/checks/nick2bad4u/megalinter-config-nick2bad4u?color=green)](https://github.com/Nick2bad4u/megalinter-config-nick2bad4u/actions)

Shared [MegaLinter](https://megalinter.io/) policy for Nick2bad4u repositories. The package combines a publishable MegaLinter base with stable wrappers and synchronized copies of the existing `*-config-nick2bad4u` packages.

## Install

```sh
npm install --save-dev megalinter-config-nick2bad4u
```

Create `.mega-linter.yml` in the consuming repository:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/oxsecurity/megalinter/main/megalinter/descriptors/schemas/megalinter-configuration.jsonschema.json
EXTENDS: "node_modules/megalinter-config-nick2bad4u/megalinter-shared.yml"
```

Run `npm ci` before MegaLinter. The shared policy intentionally uses the project-local ESLint, Prettier, Stylelint, npm-package-json-lint, Secretlint, and jscpd executables so their versions match the installed shared presets. The package lock therefore pins both the MegaLinter policy and its npm toolchain.

A remote base is also supported, but the npm package is still required because the base references its bundled files:

```yaml
EXTENDS: "https://raw.githubusercontent.com/Nick2bad4u/megalinter-config-nick2bad4u/main/megalinter-shared.yml"
```

The example uses `main` because the initial npm publication predates the first complete source tag. Pin an immutable release tag in production after the corrective tagged release is available.

## Shared and local in one repository

This repository contains both layers:

| File                              | Purpose                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `megalinter-shared.yml`           | Published base consumed from npm or a pinned raw GitHub URL. Its config paths point into the installed npm package. |
| `.mega-linter.yml`                | Repository-local overlay. It extends the base and replaces only config paths with source-tree equivalents.          |
| `configs/*.mjs` / `configs/*.cjs` | Stable wrappers around npm shareable configs.                                                                       |
| `configs/generated/`              | Deterministic snapshots copied from static shared-config packages by `npm run build`. Do not edit them directly.    |

The local overlay is not a second policy. It exists so this package can lint and test itself before publication without installing itself recursively.

## Integrated policies

The active MegaLinter policy uses the shared Actionlint, Checkov, CSpell, DevSkim, ESLint, Grype, HTMLHint, jscpd, Lychee, markdownlint, npm-package-json-lint, Prettier, Secretlint, Stylelint, and yamllint configurations.

The ESLint wrapper deliberately uses `eslint-config-nick2bad4u`'s published `withoutYamllint` composition preset. MegaLinter runs native yamllint with `yamllint-config-nick2bad4u`, preserving YAML coverage without registering the same policy through two incompatible engines.

`gitleaks-config-nick2bad4u`, `kics-config-nick2bad4u`, `markdown-link-check-config-nick2bad4u`, and `remark-config-nick2bad4u` remain packaged as compatibility assets. MegaLinter has retired or deprecated the KICS (including Terraform Checkov), Markdown Link Check, and Remark integrations; Lychee replaces Markdown Link Check in the active policy. Those compatibility files are available for dedicated workflows without encoding deprecated MegaLinter keys.

## Safer defaults

The shared policy is enforcing by default:

- linter and formatter failures are blocking;
- source fixes are disabled unless a consumer opts in;
- the full codebase is validated;
- generated and gitignored files are skipped;
- third-party MegaLinter plugins are not downloaded implicitly;
- the LLM advisor is not enabled implicitly, so consumers do not incur credential, cost, or data-disclosure surprises.

Consumer settings override inherited values. For example:

```yaml
EXTENDS: "node_modules/megalinter-config-nick2bad4u/megalinter-shared.yml"
VALIDATE_ALL_CODEBASE: false
ADDITIONAL_EXCLUDED_DIRECTORIES:
 - "vendor-generated"
```

Do not set `DISABLE_ERRORS: true` globally. Use `DISABLE_ERRORS_LINTERS` for a deliberate, temporary non-blocking rollout of one named linter.

## GitHub Actions

Copy [`examples/mega-linter.yml`](examples/mega-linter.yml) to `.github/workflows/mega-linter.yml` in a consumer. It installs the locked npm graph before invoking the SHA-pinned MegaLinter action and uploads reports even on failure.

## Programmatic paths

```js
import configUrl, { resolveConfig } from "megalinter-config-nick2bad4u";

console.log(configUrl.pathname);
console.log(resolveConfig("generated/yamllint.yaml").pathname);
```

## Development

```sh
npm ci --ignore-scripts
npm run build
npm run release:verify
npm run test:consumer
```

`release:verify` checks generated assets, validates both YAML layers against MegaLinter's current official schema, rejects deprecated keys, loads the JavaScript wrappers, runs the repository's shared lint presets, and inspects the npm package. `test:consumer` additionally installs the produced tarball in a fresh temporary project and imports it without source-tree dev dependencies.

Publishing, tagging, and version bumps are intentionally handled only by the manual release workflow.

## License

[MIT](LICENSE)
