import { test, expect } from "bun:test";

// Integration tests require live credentials (H1_USERNAME, H1_API_KEY, ANTHROPIC_API_KEY).
// Run via: bun run test:integration (executed in CI post-merge with secrets).
test("integration placeholder", () => {
  expect(true).toBe(true);
});
