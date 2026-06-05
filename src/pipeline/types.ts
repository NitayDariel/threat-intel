import type { RawItem } from "../adapters/types.js";
import type { ThreatIntelRecord } from "../types/Record.js";

export interface NormalizedItem extends RawItem {
  content: string; // alias for rawContent post-normalization
}

// A successfully classified item — all vocab fields assigned by LLM
export type ClassifiedItem = Omit<ThreatIntelRecord, "id" | "ingested"> & {
  title: string;
  source_url: string;
  published: string; // ISO-8601 date string
  rawContent: string;
};

// A failed classification — preserved for logging, not stored
export interface FailedItem {
  failed: true;
  error: string;
  original: RawItem;
}

export type ClassifyResult = ClassifiedItem | FailedItem;

export interface StorageResult {
  id: string;
  path: string;
  status: "created" | "skipped";
}

export interface PipelineResult {
  fetched: number;
  classified: number;
  failed: number;
  deduped: number;
  stored: number;
}
