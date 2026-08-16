# Repository instructions

## Purpose

This package publishes one shared MegaLinter policy and the config assets it needs. Keep `megalinter-shared.yml` consumer-safe and keep `.mega-linter.yml` as a thin source-tree overlay; do not fork policy between them.

## Generated assets

- Do not edit `configs/generated/` directly.
- Update the owning `*-config-nick2bad4u` dependency, run `npm run build`, and commit the synchronized output.
- Every shared `*_CONFIG_FILE` path must have an equivalent local override. `npm run lint:configs` enforces the mapping.
- Keep retired MegaLinter integrations such as KICS, Markdown Link Check, and Remark out of `ENABLE_LINTERS`. Their files are compatibility assets only.

## Commands

```sh
npm ci --ignore-scripts
npm run build
npm run release:verify
npm run test:consumer
```

Use npm 12. Preserve `strict-allow-scripts=true`; review `npm install-scripts ls --json` before changing `allowScripts`.

## Review priorities

Treat these as release blockers: deprecated or unknown MegaLinter keys, non-blocking global error policy, implicit source mutation, unpinned third-party plugins, package paths missing from the tarball, generated-config drift, and a packed consumer that cannot import the wrappers.

Do not publish, tag, bump the version, or dispatch the release workflow without explicit authorization.
