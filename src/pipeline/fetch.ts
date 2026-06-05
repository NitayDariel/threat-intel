import type { SourceAdapter, RawItem } from "../adapters/types.js";

export async function fetchFromSources(
  adapters: SourceAdapter[],
  since: Date,
): Promise<RawItem[]> {
  const results = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const items: RawItem[] = [];
      for await (const item of adapter.fetchSince(since)) {
        items.push(item);
      }
      console.error(`[fetch] ${adapter.sourceId}: ${items.length} items`);
      return items;
    }),
  );

  const all: RawItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      all.push(...result.value);
    } else {
      console.error(`[fetch] adapter failed: ${(result.reason as Error).message}`);
    }
  }
  return all;
}
