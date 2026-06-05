import Anthropic from "@anthropic-ai/sdk";
import type { RawItem } from "../adapters/types.js";
import type { ClassifyResult, ClassifiedItem, FailedItem } from "./types.js";

// Controlled vocabulary embedded in prompt so the model knows valid values
const VOCAB = {
  target_domain: [
    "wifi-protocols", "network-protocols", "bluetooth", "linux-kernel",
    "windows-kernel", "android-binder", "macos-xnu", "v8-engine",
    "python-runtime", "jvm", "llvm-clang", "browser-sandbox", "web-api",
    "llm-inference", "ai-supply-chain", "container-runtime", "supply-chain",
    "blockchain-contracts",
  ],
  attack_surface: [
    "heap", "stack", "parser", "network", "ipc", "filesystem",
    "api", "supply-chain", "logic", "side-channel",
  ],
  chain_stage: [
    "initial-access", "execution", "persistence", "privilege-escalation",
    "defense-evasion", "sandbox-escape", "lateral-movement", "exfiltration", "impact",
  ],
  source_type: [
    "disclosure", "advisory", "paper", "blog", "audit-report", "poc-release",
  ],
} as const;

const SYSTEM_PROMPT = `You are a threat intelligence analyst. Classify security research records and return a JSON array.

For each input record, return an object with these fields:
- target_domain: exactly one value from ${JSON.stringify(VOCAB.target_domain)}
- attack_surface: array of values from ${JSON.stringify(VOCAB.attack_surface)} (at least one)
- chain_stage: array of values from ${JSON.stringify(VOCAB.chain_stage)} (at least one)
- has_poc: boolean — true if a proof-of-concept exists or is described
- has_full_exploit: boolean — true if a weaponized exploit is present
- patch_available: boolean — true if a patch or fix is mentioned
- exploited_in_wild: boolean — true if active exploitation is confirmed
- source_type: exactly one value from ${JSON.stringify(VOCAB.source_type)}
- summary: 3-5 sentence synthesis of the vulnerability, root cause, and impact
- key_insight: single most important takeaway for a security researcher (1-2 sentences)
- tags: array of relevant free-form lowercase strings (version numbers, component names, techniques)
- cwe: array of CWE-NNN strings if identifiable from content, else []
- cvss_score: number 0-10 if mentioned, else null

Return ONLY a valid JSON array, one object per input. No markdown, no explanation.`;

function isValidDomain(v: string): boolean {
  return (VOCAB.target_domain as readonly string[]).includes(v) || v.startsWith("emerging:");
}

function filterVocab<T extends string>(values: unknown, valid: readonly T[]): T[] {
  if (!Array.isArray(values)) return [];
  return values.filter((v): v is T => typeof v === "string" && (valid as readonly string[]).includes(v));
}

function coerceClassified(raw: unknown, item: RawItem): ClassifiedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const target_domain = typeof r["target_domain"] === "string" && isValidDomain(r["target_domain"])
    ? (r["target_domain"] as ClassifiedItem["target_domain"])
    : "network-protocols"; // safe fallback

  return {
    title: item.title,
    source_url: item.url,
    published: item.published.toISOString().slice(0, 10),
    rawContent: item.rawContent,
    target_domain,
    attack_surface: filterVocab(r["attack_surface"], VOCAB.attack_surface),
    chain_stage: filterVocab(r["chain_stage"], VOCAB.chain_stage),
    has_poc: r["has_poc"] === true,
    has_full_exploit: r["has_full_exploit"] === true,
    patch_available: r["patch_available"] === true,
    exploited_in_wild: r["exploited_in_wild"] === true,
    source_type: (VOCAB.source_type as readonly string[]).includes(r["source_type"] as string)
      ? (r["source_type"] as ClassifiedItem["source_type"])
      : "blog",
    source_tier: item.sourceTier,
    summary: typeof r["summary"] === "string" ? r["summary"] : "",
    key_insight: typeof r["key_insight"] === "string" ? r["key_insight"] : undefined,
    tags: Array.isArray(r["tags"]) ? r["tags"].filter((t): t is string => typeof t === "string") : [],
    cwe: Array.isArray(r["cwe"]) ? r["cwe"].filter((c): c is string => typeof c === "string") : [],
    cvss_score: typeof r["cvss_score"] === "number" ? r["cvss_score"] : undefined,
    cve: item.rawCve,
    related_ids: [],
  };
}

async function classifyBatch(
  client: Anthropic,
  batch: RawItem[],
): Promise<ClassifyResult[]> {
  const input = batch.map((item, i) => ({
    index: i,
    title: item.title,
    content: item.rawContent.slice(0, 2000), // cap per item to stay within context
    cve: item.rawCve,
    severity: item.rawSeverity,
  }));

  let text: string;
  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    text = msg.content.map(b => (b.type === "text" ? b.text : "")).join("");
  } catch (err) {
    // Retry once
    try {
      await new Promise(r => setTimeout(r, 2000));
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(input) }],
      });
      text = msg.content.map(b => (b.type === "text" ? b.text : "")).join("");
    } catch (retryErr) {
      console.error(`[classify] API error (batch of ${batch.length}): ${(retryErr as Error).message}`);
      return batch.map(item => ({ failed: true, error: "API error after retry", original: item } satisfies FailedItem));
    }
  }

  let parsed: unknown[];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    parsed = JSON.parse(jsonMatch?.[0] ?? text) as unknown[];
  } catch {
    console.error(`[classify] JSON parse failed for batch of ${batch.length}`);
    return batch.map(item => ({ failed: true, error: "JSON parse failed", original: item } satisfies FailedItem));
  }

  return batch.map((item, i) => {
    const raw = parsed[i];
    const classified = coerceClassified(raw, item);
    if (!classified) {
      return { failed: true, error: "coercion failed", original: item } satisfies FailedItem;
    }
    return classified;
  });
}

export async function classify(items: RawItem[]): Promise<ClassifyResult[]> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required for classification");
  }

  const client = new Anthropic({ apiKey });
  const batchSize = parseInt(process.env["CLASSIFY_BATCH_SIZE"] ?? "10", 10);
  const results: ClassifyResult[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.error(`[classify] batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
    const batchResults = await classifyBatch(client, batch);
    results.push(...batchResults);
  }

  return results;
}
