import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import type { ClassifiedItem, StorageResult } from "./types.js";

export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function computeId(title: string, published: string): string {
  return createHash("sha256")
    .update(title + ":" + published)
    .digest("hex")
    .slice(0, 16);
}

export async function store(
  items: ClassifiedItem[],
  storeDir: string,
): Promise<StorageResult[]> {
  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true });
  }

  const existingFiles = new Set(readdirSync(storeDir));
  const results: StorageResult[] = [];

  for (const item of items) {
    const id = computeId(item.title, item.published);
    const slug = toSlug(item.title);
    const filename = `${id.slice(0, 8)}-${slug}.md`;
    const filepath = join(storeDir, filename);

    if (existingFiles.has(filename)) {
      results.push({ id, path: filepath, status: "skipped" });
      continue;
    }

    const frontmatter = yaml.dump({
      id,
      title: item.title,
      source_url: item.source_url,
      published: item.published,
      ingested: new Date().toISOString(),
      ...(item.cwe?.length ? { cwe: item.cwe } : {}),
      ...(item.cvss_score != null ? { cvss_score: item.cvss_score } : {}),
      ...(item.cve ? { cve: item.cve } : {}),
      ...(item.attack_techniques?.length ? { attack_techniques: item.attack_techniques } : {}),
      target_domain: item.target_domain,
      attack_surface: item.attack_surface,
      chain_stage: item.chain_stage,
      has_poc: item.has_poc,
      has_full_exploit: item.has_full_exploit,
      patch_available: item.patch_available,
      exploited_in_wild: item.exploited_in_wild,
      source_tier: item.source_tier,
      source_type: item.source_type,
      ...(item.researcher?.length ? { researcher: item.researcher } : {}),
      tags: item.tags,
      related_ids: item.related_ids,
      ...(item.embedding_id ? { embedding_id: item.embedding_id } : {}),
    }, { lineWidth: 120 });

    const body = [
      "---",
      frontmatter.trim(),
      "---",
      "",
      "## Summary",
      item.summary,
      "",
      ...(item.key_insight ? ["## Key Insight", item.key_insight, ""] : []),
      "## Source",
      item.source_url,
    ].join("\n");

    writeFileSync(filepath, body, "utf-8");
    existingFiles.add(filename);
    results.push({ id, path: filepath, status: "created" });
  }

  return results;
}
