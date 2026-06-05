import { describe, test, expect, afterEach } from "bun:test";
import { RssAdapter } from "../../../src/adapters/rss.js";
import type { SourceDefinition } from "../../../src/sources/index.js";
import type { RawItem } from "../../../src/adapters/types.js";

const mockSource: SourceDefinition = {
  name: "Test Feed",
  feed_url: "https://example.com/feed",
  format: "rss",
  tier: 2,
  domain_coverage: ["web-api"],
  update_cadence: "weekly",
};

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>New RCE in Widget Parser</title>
    <link>https://example.com/rce-widget</link>
    <pubDate>Wed, 04 Jun 2026 12:00:00 GMT</pubDate>
    <description>&lt;p&gt;Heap overflow in widget_parse()&lt;/p&gt;</description>
  </item>
  <item>
    <title>Old Advisory From 2020</title>
    <link>https://example.com/old</link>
    <pubDate>Mon, 01 Jan 2020 00:00:00 GMT</pubDate>
    <description>Old finding</description>
  </item>
</channel></rss>`;

const ATOM_XML = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom Entry: SQL Injection</title>
    <link href="https://example.com/sqli"/>
    <published>2026-06-04T10:00:00Z</published>
    <summary>SQL injection via unsanitized input</summary>
  </entry>
</feed>`;

const SPARSE_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>Minimal Item</title>
    <link>https://example.com/minimal</link>
    <pubDate>Thu, 05 Jun 2026 08:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

function mockFetch(xml: string): typeof fetch {
  return (async () => new Response(xml, { status: 200 })) as unknown as typeof fetch;
}

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe("RssAdapter", () => {
  test("yields only items published after since date", async () => {
    globalThis.fetch = mockFetch(RSS_XML);
    const adapter = new RssAdapter(mockSource);
    const since = new Date("2026-01-01T00:00:00Z");
    const items: RawItem[] = [];
    for await (const item of adapter.fetchSince(since)) items.push(item);

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("New RCE in Widget Parser");
    expect(items[0]?.rawContent).not.toContain("<p>");
  });

  test("handles Atom format correctly", async () => {
    globalThis.fetch = mockFetch(ATOM_XML);
    const adapter = new RssAdapter(mockSource);
    const since = new Date("2026-01-01T00:00:00Z");
    const items: RawItem[] = [];
    for await (const item of adapter.fetchSince(since)) items.push(item);

    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Atom Entry: SQL Injection");
    expect(items[0]?.url).toBe("https://example.com/sqli");
  });

  test("does not throw when optional fields are missing", async () => {
    globalThis.fetch = mockFetch(SPARSE_XML);
    const adapter = new RssAdapter(mockSource);
    const since = new Date("2026-01-01T00:00:00Z");
    const items: RawItem[] = [];
    for await (const item of adapter.fetchSince(since)) items.push(item);

    expect(items).toHaveLength(1);
    expect(items[0]?.rawContent).toBe("");
  });
});
