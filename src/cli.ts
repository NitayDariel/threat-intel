import { SOURCES } from "./sources/index.js";
import { RssAdapter } from "./adapters/rss.js";
import { JsonApiAdapter } from "./adapters/json-api.js";
import { HackerOneAdapter } from "./adapters/hackerone.js";
import { GithubApiAdapter } from "./adapters/github-api.js";
import { ArxivAdapter } from "./adapters/arxiv.js";
import { fetchFromSources } from "./pipeline/fetch.js";
import { classify } from "./pipeline/classify.js";
import { dedup } from "./pipeline/dedup.js";
import { store } from "./pipeline/store.js";
import type { SourceAdapter } from "./adapters/types.js";
import type { ClassifiedItem, FailedItem } from "./pipeline/types.js";

function parseArgs(argv: string[]): {
  since: Date;
  sourceIds: string[] | null;
  dryRun: boolean;
  storeDir: string;
} {
  const args = argv.slice(2);
  let since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let sourceIds: string[] | null = null;
  let dryRun = false;
  const storeDir = process.env["INTEL_STORE_PATH"] ?? `${process.env["HOME"]}/.threat-intel/records`;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--since" && args[i + 1]) {
      const parsed = new Date(args[++i]!);
      if (!isNaN(parsed.getTime())) since = parsed;
      else { console.error(`Invalid --since date: ${args[i]}`); process.exit(1); }
    } else if (arg === "--source" && args[i + 1]) {
      sourceIds = args[++i]!.split(",").map(s => s.trim().toLowerCase());
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { since, sourceIds, dryRun, storeDir };
}

function buildAdapter(source: typeof SOURCES[number]): SourceAdapter | null {
  switch (source.format) {
    case "rss":
    case "atom":
      return new RssAdapter(source);
    case "json-api":
      return new JsonApiAdapter(source);
    case "rest-api":
      if (source.name.toLowerCase().includes("hackerone")) return new HackerOneAdapter();
      return null;
    case "github-api":
      return new GithubApiAdapter(source);
    case "arxiv-api":
      return new ArxivAdapter(source);
    default:
      return null;
  }
}

async function main(): Promise<void> {
  const { since, sourceIds, dryRun, storeDir } = parseArgs(process.argv);

  const selectedSources = sourceIds
    ? SOURCES.filter(s => sourceIds.some(id => s.name.toLowerCase().includes(id)))
    : SOURCES;

  const adapters: SourceAdapter[] = selectedSources
    .map(buildAdapter)
    .filter((a): a is SourceAdapter => a !== null);

  if (adapters.length === 0) {
    console.error("No adapters matched the --source filter.");
    process.exit(1);
  }

  console.error(`[cli] ingesting ${adapters.length} sources since ${since.toISOString()}`);
  if (dryRun) console.error("[cli] --dry-run: skipping store");

  let rawItems = await fetchFromSources(adapters, since);
  const fetched = rawItems.length;

  const classifyResults = await classify(rawItems);
  const classifiedItems = classifyResults.filter((r): r is ClassifiedItem => !("failed" in r));
  const failedItems = classifyResults.filter((r): r is FailedItem => "failed" in r);

  const dedupedItems = await dedup(classifiedItems, storeDir);

  let stored = 0;
  if (!dryRun) {
    const storeResults = await store(dedupedItems, storeDir);
    stored = storeResults.filter(r => r.status === "created").length;
  }

  console.log(
    `Fetched ${fetched} | Classified ${classifiedItems.length} | Failed ${failedItems.length} | Deduped ${dedupedItems.length} | Stored ${stored}`
  );
}

main().catch(err => {
  console.error(`[cli] fatal: ${(err as Error).message}`);
  process.exit(1);
});
