import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { store } from "../../../src/pipeline/store.js";
import type { ClassifiedItem } from "../../../src/pipeline/types.js";

function makeItem(overrides: Partial<ClassifiedItem> = {}): ClassifiedItem {
  return {
    title: "Heap Overflow in SSL Parser",
    source_url: "https://example.com/vuln",
    published: "2026-06-01",
    rawContent: "raw content",
    target_domain: "network-protocols",
    attack_surface: ["heap", "parser"],
    chain_stage: ["initial-access", "execution"],
    has_poc: true,
    has_full_exploit: false,
    patch_available: true,
    exploited_in_wild: false,
    source_tier: 1,
    source_type: "disclosure",
    summary: "A heap overflow in the SSL parser allows remote code execution.",
    key_insight: "The bug is triggered by a malformed ClientHello extension.",
    tags: ["ssl", "tls", "heap-overflow"],
    related_ids: [],
    ...overrides,
  };
}

let tmpDir: string;
beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "threat-intel-store-test-")); });
afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }); });

describe("store", () => {
  test("writes correct YAML frontmatter and markdown body", async () => {
    const item = makeItem();
    const results = await store([item], tmpDir);

    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("created");

    const content = readFileSync(results[0]!.path, "utf-8");
    expect(content).toContain("target_domain: network-protocols");
    expect(content).toContain("has_poc: true");
    expect(content).toContain("source_tier: 1");
    expect(content).toContain("## Summary");
    expect(content).toContain("A heap overflow in the SSL parser");
    expect(content).toContain("## Key Insight");
    expect(content).toContain("## Source");
    expect(content).toContain("https://example.com/vuln");
  });

  test("returns status: skipped on re-run with same item (idempotent)", async () => {
    const item = makeItem();
    await store([item], tmpDir);
    const results2 = await store([item], tmpDir);

    expect(results2[0]?.status).toBe("skipped");
  });
});
