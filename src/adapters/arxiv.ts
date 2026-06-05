import type { SourceAdapter, RawItem } from "./types.js";
import type { SourceDefinition } from "../sources/index.js";
import { RssAdapter } from "./rss.js";

// ArXiv cs.CR feed is standard RSS 2.0 — delegate to RssAdapter
export class ArxivAdapter implements SourceAdapter {
  readonly sourceId = "arxiv-cs-cr";
  private readonly rss: RssAdapter;

  constructor(source: SourceDefinition) {
    this.rss = new RssAdapter(source);
  }

  async *fetchSince(since: Date): AsyncIterable<RawItem> {
    for await (const item of this.rss.fetchSince(since)) {
      // Ensure URL is the canonical arxiv abs link, not the HTML redirect
      yield {
        ...item,
        url: item.url.replace("http://", "https://").replace("/pdf/", "/abs/"),
      };
    }
  }
}
