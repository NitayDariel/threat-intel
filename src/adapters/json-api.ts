import type { SourceAdapter, RawItem } from "./types.js";
import type { SourceDefinition } from "../sources/index.js";

export interface FieldMapping {
  title: string;
  url: string;
  published: string;
  content?: string;
}

const DEFAULT_MAPPING: FieldMapping = {
  title: "title",
  url: "url",
  published: "published",
  content: "description",
};

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

async function fetchWithRetry(url: string, headers: Record<string, string>): Promise<Response> {
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      const delay = Math.pow(2, attempt) * 1000;
      console.error(`[json-api] 429 rate-limited — retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      lastErr = new Error("Rate limited after retries");
      continue;
    }
    return res;
  }
  throw lastErr ?? new Error("Max retries exceeded");
}

export class JsonApiAdapter implements SourceAdapter {
  readonly sourceId: string;
  private readonly mapping: FieldMapping;

  constructor(
    private readonly source: SourceDefinition,
    private readonly headers: Record<string, string> = {},
    mapping: Partial<FieldMapping> = {},
  ) {
    this.sourceId = source.name.toLowerCase().replace(/\s+/g, "-");
    this.mapping = { ...DEFAULT_MAPPING, ...mapping };
  }

  async *fetchSince(since: Date): AsyncIterable<RawItem> {
    let url: string | undefined = this.source.feed_url;

    while (url) {
      let res: Response;
      try {
        res = await fetchWithRetry(url, this.headers);
      } catch (err) {
        console.error(`[${this.source.name}] ${(err as Error).message}`);
        return;
      }

      if (!res.ok) {
        console.error(`[${this.source.name}] HTTP ${res.status}`);
        return;
      }

      const body = (await res.json()) as Record<string, unknown>;

      // Support both flat arrays and paginated {data: [...], links: {next}} shapes
      const items: unknown[] = Array.isArray(body)
        ? body
        : Array.isArray(body["data"])
          ? (body["data"] as unknown[])
          : Array.isArray(body["vulnerabilities"])
            ? (body["vulnerabilities"] as unknown[])
            : [];

      let hitWall = false;
      for (const raw of items) {
        const obj = raw as Record<string, unknown>;
        const title = String(get(obj, this.mapping.title) ?? "");
        const urlStr = String(get(obj, this.mapping.url) ?? "");
        const publishedStr = String(get(obj, this.mapping.published) ?? "");
        const content = this.mapping.content ? String(get(obj, this.mapping.content) ?? "") : "";

        if (!title || !urlStr) continue;
        const published = new Date(publishedStr);
        if (isNaN(published.getTime())) continue;
        if (published <= since) { hitWall = true; break; }

        yield {
          title,
          url: urlStr,
          published,
          rawContent: content,
          sourceName: this.source.name,
          sourceTier: this.source.tier,
        };
      }

      if (hitWall) break;

      const nextUrl = (body["links"] as Record<string, unknown> | undefined)?.["next"];
      url = typeof nextUrl === "string" ? nextUrl : undefined;
    }
  }
}
