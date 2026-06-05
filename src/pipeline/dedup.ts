import { createHash } from "crypto";
import { existsSync, readdirSync } from "fs";
import type { ClassifiedItem } from "./types.js";

export function computeId(title: string, published: string): string {
  return createHash("sha256")
    .update(title + ":" + published)
    .digest("hex")
    .slice(0, 16);
}

export async function dedup(
  items: ClassifiedItem[],
  storeDir: string,
): Promise<ClassifiedItem[]> {
  const existingIds = new Set<string>();

  if (existsSync(storeDir)) {
    for (const filename of readdirSync(storeDir)) {
      // Filename format: {16-char-id}-{slug}.md
      const idPrefix = filename.slice(0, 16);
      if (idPrefix.length === 16) existingIds.add(idPrefix);
    }
  }

  const fresh: ClassifiedItem[] = [];
  let skipped = 0;

  for (const item of items) {
    const id = computeId(item.title, item.published);
    if (existingIds.has(id)) {
      skipped++;
    } else {
      existingIds.add(id); // prevent duplicates within this batch
      fresh.push(item);
    }
  }

  if (skipped > 0) {
    console.error(`[dedup] skipped ${skipped} already-stored records`);
  }
  return fresh;
}
