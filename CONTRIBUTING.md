# Contributing

Install with `npm ci --ignore-scripts`, run `npm run build`, and finish with `npm run release:verify`.

Files below `configs/generated/` are synchronized from published shared-config dependencies. Update the dependency and run `npm run build` instead of editing a generated file directly. Keep consumer-facing behavior documented in `README.md` and add tests for every shared/local mapping change.
