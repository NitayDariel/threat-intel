import type { SourceAdapter, RawItem } from "./types.js";
import type { SourceDefinition } from "../sources/index.js";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m?.[1]?.trim();
}

function extractAttr(xml: string, tag: string, attr: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, "i"));
  return m?.[1];
}

function parseDate(str: string | undefined): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function parseItems(xml: string, since: Date, source: SourceDefinition): RawItem[] {
  const isAtom = xml.includes("<feed");
  const itemTag = isAtom ? "entry" : "item";
  const itemRe = new RegExp(`<${itemTag}[\\s>]([\\s\\S]*?)<\\/${itemTag}>`, "gi");
  const results: RawItem[] = [];

  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1] ?? "";

    const title = stripHtml(extractTag(block, "title") ?? "");
    const url = isAtom
      ? (extractAttr(block, "link", "href") ?? extractTag(block, "link") ?? "")
      : (extractTag(block, "link") ?? "");
    const rawDate = isAtom
      ? (extractTag(block, "published") ?? extractTag(block, "updated"))
      : extractTag(block, "pubDate");
    const published = parseDate(rawDate);
    const rawContent = stripHtml(
      extractTag(block, "content") ?? extractTag(block, "description") ?? extractTag(block, "summary") ?? ""
    );

    if (!title || !url || !published || published <= since) continue;

    results.push({
      title,
      url,
      published,
      rawContent,
      sourceName: source.name,
      sourceTier: source.tier,
    });
  }
  return results;
}

export class RssAdapter implements SourceAdapter {
  readonly sourceId: string;

  constructor(private readonly source: SourceDefinition) {
    this.sourceId = source.name.toLowerCase().replace(/\s+/g, "-");
  }

  async *fetchSince(since: Date): AsyncIterable<RawItem> {
    try {
      const res = await fetch(this.source.feed_url);
      if (!res.ok) {
        console.error(`[${this.source.name}] HTTP ${res.status} — skipping`);
        return;
      }
      const xml = await res.text();
      const items = parseItems(xml, since, this.source);
      for (const item of items) yield item;
    } catch (err) {
      console.error(`[${this.source.name}] fetch error: ${(err as Error).message}`);
    }
  }
}
