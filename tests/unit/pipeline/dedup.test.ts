import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { dedup, computeId } from "../../../src/pipeline/dedup.js";
import type { ClassifiedItem } from "../../../src/pipeline/types.js";

function makeItem(title: string, published: string): ClassifiedItem {
  return {
    title,
    source_url: "https://example.com",
    published,
    rawContent: "test content",
    target_domain: "web-api",
    attack_surface: ["network"],
    chain_stage: ["initial-access"],
    has_poc: false,
    has_full_exploit: false,
    patch_available: false,
    exploited_in_wild: false,
    source_tier: 2,
    source_type: "blog",
    summary: "Test summary",
    tags: [],
    related_ids: [],
  };
}

let tmpDir: string;
beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "threat-intel-test-")); });
afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }); });

describe("dedup", () => {
  test("returns all items when store directory is empty", async () => {
    const items = [makeItem("XSS in Login Form", "2026-06-01"), makeItem("RCE via Parser", "2026-06-02")];
    const result = await dedup(items, tmpDir);
    expect(result).toHaveLength(2);
  });

  test("skips items whose ID matches an existing file in storeDir", async () => {
    const item = makeItem("Known Vulnerability", "2026-05-01");
    const id = computeId(item.title, item.published);
    // Create a fake existing record file with the matching ID prefix
    writeFileSync(join(tmpDir, `${id}-known-vulnerability.md`), "existing record");

    const newItem = makeItem("Fresh Discovery", "2026-06-05");
    const result = await dedup([item, newItem], tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Fresh Discovery");
  });
});
