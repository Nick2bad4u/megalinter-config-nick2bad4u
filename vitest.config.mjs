import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            include: ["preset.mjs", "configs/**/*.{cjs,mjs}"],
            provider: "v8",
            reporter: [
                "text",
                "json-summary",
                "lcov",
            ],
            thresholds: {
                branches: 100,
                functions: 100,
                lines: 100,
                statements: 100,
            },
        },
        environment: "node",
        restoreMocks: true,
        slowTestThreshold: 30_000,
    },
});
