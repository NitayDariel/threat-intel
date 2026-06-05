/**
 * Nature of the source document being ingested.
 * Determines what fields are likely populated and how much analysis is present.
 */
export type SourceType =
  | "disclosure"    // full researcher write-up: bug, root cause, exploit path
  | "advisory"      // vendor or CERT advisory: CVE + patch, minimal analysis
  | "paper"         // academic / conference paper: methodology-heavy, reproducible
  | "blog"          // security researcher blog post: variable depth
  | "audit-report"  // code audit finding: contract, library, or firmware
  | "poc-release";  // PoC or exploit drop: code-first, analysis optional
