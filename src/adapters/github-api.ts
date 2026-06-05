import type { SourceAdapter, RawItem } from "./types.js";
import type { SourceDefinition } from "../sources/index.js";
import { RssAdapter } from "./rss.js";

// GHSL advisories are published as an Atom feed — delegate to RssAdapter.
// Optional GITHUB_TOKEN increases rate limits from 60 to 5000 req/hr.
export class GithubApiAdapter implements SourceAdapter {
  readonly sourceId = "ghsl";
  private readonly rss: RssAdapter;

  constructor(private readonly source: SourceDefinition) {
    this.rss = new RssAdapter(source);
  }

  async *fetchSince(since: Date): AsyncIterable<RawItem> {
    const token = process.env["GITHUB_TOKEN"];
    if (token) {
      // Inject auth header by fetching manually and passing to RssAdapter-compatible parser
      try {
        const res = await fetch(this.source.feed_url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.error(`[GHSL] HTTP ${res.status}`);
          return;
        }
        // Re-use the rss adapter's parsing by temporarily swapping fetch
        const xml = await res.text();
        // Pass raw XML through same parse path via a mock adapter trick
        // Instead: inline the same parsing by delegating to an Atom-format parse helper
        for await (const item of parseAtomXml(xml, since, this.source)) {
          yield item;
        }
      } catch (err) {
        console.error(`[GHSL] error: ${(err as Error).message}`);
      }
    } else {
      for await (const item of this.rss.fetchSince(since)) yield item;
    }
  }
}

async function* parseAtomXml(xml: string, since: Date, source: SourceDefinition): AsyncIterable<RawItem> {
  const entryRe = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;

  while ((match = entryRe.exec(xml)) !== null) {
    const block = match[1] ?? "";
    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
    const url = block.match(/<link[^>]*\shref="([^"]+)"/i)?.[1] ?? "";
    const rawDate = block.match(/<published>([\s\S]*?)<\/published>/i)?.[1] ??
                    block.match(/<updated>([\s\S]*?)<\/updated>/i)?.[1];
    const published = rawDate ? new Date(rawDate) : null;
    const rawContent = (block.match(/<(?:content|summary)[^>]*>([\s\S]*?)<\/(?:content|summary)>/i)?.[1] ?? "")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (!title || !url || !published || isNaN(published.getTime()) || published <= since) continue;

    yield { title, url, published, rawContent, sourceName: source.name, sourceTier: source.tier };
  }
}
