export interface RawItem {
  title: string;
  url: string;
  published: Date;
  rawContent: string; // plain text — HTML stripped by adapter
  sourceName: string;
  sourceTier: 1 | 2 | 3;
  rawCve?: string;       // e.g. "CVE-2024-12345" if extractable from source
  rawSeverity?: string;  // e.g. "critical" from source metadata
}

export interface SourceAdapter {
  readonly sourceId: string;
  fetchSince(since: Date): AsyncIterable<RawItem>;
}
