import type { TargetDomain } from "../vocab/target-domain.js";
import type { AttackSurface } from "../vocab/attack-surface.js";
import type { ChainStage } from "../vocab/chain-stage.js";
import type { SourceType } from "../vocab/source-type.js";

export interface ThreatIntelRecord {
  // Identity — content-addressed, stable across re-ingestion
  id: string; // sha256(canonical_title + published_date)[:16]
  title: string;
  source_url: string;
  published: string; // ISO-8601 date: "2024-01-15"
  ingested: string;  // ISO-8601 datetime: "2026-06-05T12:00:00Z"

  // Standards-based dimensions
  cwe?: string[];            // ["CWE-416", "CWE-122"]
  cvss_score?: number;       // 0–10
  cvss_vector?: string;      // "CVSS:3.1/AV:N/AC:L/..."
  cve?: string;              // "CVE-2024-12345"
  attack_techniques?: string[]; // ["T1203", "T1068"]

  // Researcher-derived dimensions — controlled vocab, independently filterable
  target_domain: TargetDomain;    // primary domain, non-optional
  attack_surface: AttackSurface[]; // one or more entry points
  chain_stage: ChainStage[];       // kill-chain positions covered

  // Evidence quality — directly determines AI context usefulness
  has_poc: boolean;
  has_full_exploit: boolean;
  patch_available: boolean;
  exploited_in_wild: boolean;

  // Source credibility
  source_tier: 1 | 2 | 3; // 1=elite researcher/lab, 2=known firm/blog, 3=community
  source_type: SourceType;
  researcher?: string[];   // ["tavis-ormandy", "jann-horn"]

  // Content
  summary: string;       // LLM-generated 3–5 sentence synthesis, stored at ingest time
  key_insight?: string;  // most important single takeaway for a researcher

  // Free-form extensibility
  tags: string[];

  // Forward-compatibility stubs — populated in v2/v3
  related_ids: string[];   // variant/chain links; empty array by default
  embedding_id?: string;   // reference to vector store entry; undefined until v3
}
