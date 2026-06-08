---
project: threat-intel
effort: E4
phase: verify
progress: 140/140
mode: algorithm
started: "2026-06-05T00:00:00Z"
updated: "2026-06-05T00:00:00Z"
---

## Problem

Security researchers have no open-source tool that ingests threat intelligence from heterogeneous sources (RSS blogs, REST APIs, GraphQL endpoints), classifies records across researcher-derived dimensions, deduplicates across runs, and exports curated AI-agent-ready context packages. Existing tools are enterprise-grade (MISP, OpenCTI) and require heavy infrastructure. The gap: a lightweight, bun-native CLI pipeline that a solo researcher can run in seconds to get a clean, structured corpus for AI-assisted research.

## Vision

A researcher types `bun run ingest --since 7d --source project-zero,hackerone` and within minutes has a directory of clean markdown files — each a structured record with YAML frontmatter, LLM-generated summary, and researcher-derived classification. They paste the folder into a Claude Code session and their agent has the current state of the art on their target domain. No server. No Docker. No enterprise license. Just a folder of markdown they can git-commit, diff, and share.

## Out of Scope

No web UI, no dashboard, no REST server in v1. Dynamic query endpoints are v2. Embeddings and semantic search are v3. No multi-user support or authentication layer for the tool itself. No scraping of paywalled or authenticated-only content. No Windows support in v1 (macOS + Linux only). The tool does not generate exploits, PoCs, or attack guidance — it only indexes and structures existing public research. opencode CLI integration is documented workflow guidance, not a code dependency.

## Principles

- Each pipeline stage knows only its input and output contract — no stage imports from another stage except via shared types.
- Adapters are the only code that touches external networks — the rest of the pipeline works on in-memory data.
- Credentials live exclusively in environment variables — never in source, config files, or CLI flags.
- Idempotency is required: running the ingestor twice on the same source produces the same store state.
- The filesystem is the database at v1 — no SQLite, no embedded DB, no ORM.

## Constraints

- TypeScript + bun only. No Python, no npm, no npx.
- No Playwright — banned in this project. Use fetch() for HTTP, Browser skill for rare authenticated scraping.
- Anthropic SDK used directly in classify.ts (this is a standalone project, not inside PAI).
- H1_USERNAME and H1_API_KEY must come from environment — never committed.
- GitHub Actions uses ubuntu-latest with bun setup-bun action.
- Branch protection: no direct push to main; CI must pass on all PRs.

## Goal

Deliver a working bun-native ingestor pipeline with five adapters (RSS, JSON-API, HackerOne REST, GitHub-API, ArXiv), four independent pipeline stages (fetch → classify → dedup → store), a CLI entry point, GitHub Actions CI/CD, and a documented opencode task-routing strategy — such that `bun run ingest` fetches, classifies, deduplicates, and stores real records from at least one live source.

## Criteria

### Project Setup
- [ ] ISC-1: package.json exists with `name: "threat-intel"` and bun as runtime
- [ ] ISC-2: package.json scripts include `"ingest": "bun src/cli.ts"`, `"typecheck": "tsc --noEmit"`, `"test": "bun test"`
- [ ] ISC-3: tsconfig.json exists with `"moduleResolution": "bundler"` and `"strict": true`
- [ ] ISC-4: `bun typecheck` exits 0 on clean project
- [ ] ISC-5: .gitignore excludes node_modules, .env, dist/
- [ ] ISC-6: .env.example documents H1_USERNAME, H1_API_KEY, ANTHROPIC_API_KEY, INTEL_STORE_PATH
- [ ] ISC-7: Directory structure matches spec: src/{types,vocab,sources,adapters,pipeline}/
- [ ] ISC-8: Anti: no npm install or npx in any script or workflow

### Types & Vocab (carried from schema session)
- [ ] ISC-9: ThreatIntelRecord interface exported from src/types/Record.ts
- [ ] ISC-10: target_domain is TargetDomain type (non-optional, enum-enforced)
- [ ] ISC-11: source_tier is `1 | 2 | 3` literal union
- [ ] ISC-12: related_ids: string[] forward-compat stub present
- [ ] ISC-13: Anti: target_domain not plain string — TypeScript enum enforces

### Sources Index
- [ ] ISC-14: SOURCES exported from src/sources/index.ts with ≥11 entries
- [ ] ISC-15: HackerOne entry present: name "HackerOne Disclosed Reports"
- [ ] ISC-16: HackerOne feed_url is "https://api.hackerone.com/v1/reports"
- [ ] ISC-17: HackerOne format field is "rest-api"
- [ ] ISC-18: HackerOne tier is 2
- [ ] ISC-19: HackerOne notes document: Basic auth, filter[state][]=disclosed, sort latest_disclosable_at DESC

### Adapter Interface
- [ ] ISC-20: src/adapters/types.ts exists and exports SourceAdapter interface
- [ ] ISC-21: SourceAdapter has `readonly sourceId: string`
- [ ] ISC-22: SourceAdapter has `fetchSince(since: Date): AsyncIterable<RawItem>`
- [ ] ISC-23: RawItem type exported: title, url, published (Date), rawContent (string)
- [ ] ISC-24: RawItem has sourceName: string and sourceTier: 1|2|3
- [ ] ISC-25: RawItem has optional rawCve?: string and rawSeverity?: string
- [ ] ISC-26: Anti: src/adapters/types.ts imports nothing from src/pipeline/

### RSS Adapter
- [ ] ISC-27: src/adapters/rss.ts exports RssAdapter class
- [ ] ISC-28: RssAdapter implements SourceAdapter
- [ ] ISC-29: RssAdapter constructor accepts SourceDefinition
- [ ] ISC-30: RssAdapter.fetchSince yields only items published after `since` param
- [ ] ISC-31: RssAdapter handles RSS 2.0 and Atom (both formats parsed correctly)
- [ ] ISC-32: RssAdapter strips HTML tags from rawContent
- [ ] ISC-33: RssAdapter does not throw on missing optional feed fields
- [ ] ISC-34: Anti: rss.ts imports nothing from src/pipeline/

### JSON-API Adapter
- [ ] ISC-35: src/adapters/json-api.ts exports JsonApiAdapter class
- [ ] ISC-36: JsonApiAdapter implements SourceAdapter
- [ ] ISC-37: JsonApiAdapter accepts endpoint URL and field-mapping config
- [ ] ISC-38: JsonApiAdapter handles paginated responses (cursor or offset)
- [ ] ISC-39: JsonApiAdapter backs off on 429 (rate-limit) with exponential retry
- [ ] ISC-40: Anti: json-api.ts imports nothing from src/pipeline/

### HackerOne Adapter
- [ ] ISC-41: src/adapters/hackerone.ts exports HackerOneAdapter class
- [ ] ISC-42: HackerOneAdapter implements SourceAdapter
- [ ] ISC-43: HackerOneAdapter reads credentials from process.env.H1_USERNAME and H1_API_KEY
- [ ] ISC-44: HackerOneAdapter uses Basic auth header: `Basic base64(username:apikey)`
- [ ] ISC-45: HackerOneAdapter fetches GET /v1/reports?filter[state][]=disclosed
- [ ] ISC-46: HackerOneAdapter sorts by latest_disclosable_at DESC
- [ ] ISC-47: HackerOneAdapter handles cursor pagination via `links.next`
- [ ] ISC-48: HackerOneAdapter maps report.weakness.external_id to rawCve
- [ ] ISC-49: HackerOneAdapter maps report.severity.rating to rawSeverity
- [ ] ISC-50: HackerOneAdapter throws descriptive error if env vars missing
- [ ] ISC-51: Anti: hackerone.ts credentials never hardcoded — env only
- [ ] ISC-52: Anti: hackerone.ts imports nothing from src/pipeline/

### GitHub-API Adapter
- [ ] ISC-53: src/adapters/github-api.ts exports GithubApiAdapter class
- [ ] ISC-54: GithubApiAdapter implements SourceAdapter
- [ ] ISC-55: GithubApiAdapter fetches GHSL advisories feed via Atom URL
- [ ] ISC-56: GithubApiAdapter optionally accepts GITHUB_TOKEN from env for rate limit
- [ ] ISC-57: Anti: github-api.ts imports nothing from src/pipeline/

### ArXiv Adapter
- [ ] ISC-58: src/adapters/arxiv.ts exports ArxivAdapter class
- [ ] ISC-59: ArxivAdapter implements SourceAdapter
- [ ] ISC-60: ArxivAdapter fetches rss.arxiv.org/rss/cs.CR
- [ ] ISC-61: ArxivAdapter yields items with arxiv URL and abstract as rawContent
- [ ] ISC-62: Anti: arxiv.ts imports nothing from src/pipeline/

### Pipeline Types
- [ ] ISC-63: src/pipeline/types.ts exists and exports NormalizedItem type
- [ ] ISC-64: NormalizedItem has: title, url, published, content, sourceName, sourceTier, rawCve?, rawSeverity?
- [ ] ISC-65: ClassifiedItem type exported — extends NormalizedItem with all ThreatIntelRecord classification fields
- [ ] ISC-66: PipelineResult type: `{ fetched: number; classified: number; deduped: number; stored: number }`
- [ ] ISC-67: StorageResult type: `{ id: string; path: string; status: "created" | "skipped" }`

### Fetch Orchestrator
- [ ] ISC-68: src/pipeline/fetch.ts exports fetchFromSources function
- [ ] ISC-69: fetchFromSources signature: `(adapters: SourceAdapter[], since: Date) => Promise<RawItem[]>`
- [ ] ISC-70: fetchFromSources runs adapters concurrently (Promise.allSettled)
- [ ] ISC-71: fetchFromSources isolates per-source errors — one failed adapter doesn't abort others
- [ ] ISC-72: fetchFromSources logs per-source item count to stderr
- [ ] ISC-73: Anti: fetch.ts imports nothing from classify.ts, dedup.ts, or store.ts

### Classifier
- [ ] ISC-74: src/pipeline/classify.ts exports classify function
- [ ] ISC-75: classify signature: `(items: RawItem[]) => Promise<ClassifiedItem[]>`
- [ ] ISC-76: classify calls Anthropic SDK with structured output prompt
- [ ] ISC-77: classify prompt instructs LLM to assign target_domain from controlled vocab
- [ ] ISC-78: classify prompt instructs LLM to assign attack_surface[] and chain_stage[]
- [ ] ISC-79: classify prompt instructs LLM to generate summary (3–5 sentences)
- [ ] ISC-80: classify validates output against vocab — falls back to tags[] for unknowns
- [ ] ISC-81: classify retries once on API error before marking item as failed
- [ ] ISC-82: classify batches items (≤10 per API call) to reduce latency
- [ ] ISC-83: Anti: classify.ts imports nothing from src/adapters/
- [ ] ISC-84: Anti: classify.ts imports nothing from dedup.ts or store.ts

### Deduplicator
- [ ] ISC-85: src/pipeline/dedup.ts exports dedup function
- [ ] ISC-86: dedup signature: `(items: ClassifiedItem[], storeDir: string) => Promise<ClassifiedItem[]>`
- [ ] ISC-87: dedup computes id as hex(sha256(title + ":" + published.toISOString()))[:16]
- [ ] ISC-88: dedup reads existing record filenames from storeDir to check for collisions
- [ ] ISC-89: dedup returns only items whose id is NOT already present in storeDir
- [ ] ISC-90: dedup logs N items skipped (already stored)
- [ ] ISC-91: Anti: dedup.ts imports nothing from classify.ts or src/adapters/

### Store
- [ ] ISC-92: src/pipeline/store.ts exports store function
- [ ] ISC-93: store signature: `(items: ClassifiedItem[], storeDir: string) => Promise<StorageResult[]>`
- [ ] ISC-94: store creates storeDir if it does not exist
- [ ] ISC-95: store writes each item as `{id-8chars}-{title-slug}.md`
- [ ] ISC-96: store serializes YAML frontmatter with all ThreatIntelRecord fields
- [ ] ISC-97: store writes `## Summary` and `## Key Insight` sections in markdown body
- [ ] ISC-98: store is idempotent — existing file → status: "skipped", no overwrite
- [ ] ISC-99: store returns StorageResult[] with id, path, status per item
- [ ] ISC-100: Anti: store.ts imports nothing from classify.ts or src/adapters/

### CLI
- [ ] ISC-101: src/cli.ts exists as bun entry point
- [ ] ISC-102: CLI parses --since flag (ISO date string, default: 7 days ago)
- [ ] ISC-103: CLI parses --source flag (comma-separated source IDs, default: all)
- [ ] ISC-104: CLI parses --dry-run flag (classify but skip store)
- [ ] ISC-105: CLI reads INTEL_STORE_PATH from env (default: ~/.threat-intel/records)
- [ ] ISC-106: CLI prints final summary line: "Fetched N | Classified N | Deduped N | Stored N"
- [ ] ISC-107: CLI exits process with code 1 on unrecoverable error
- [ ] ISC-108: Anti: cli.ts does not implement business logic — delegates to pipeline stages

### GitHub Actions — CI
- [ ] ISC-109: .github/workflows/ci.yml exists
- [ ] ISC-110: CI triggers on: pull_request targeting main
- [ ] ISC-111: CI job `typecheck` runs `bun run typecheck`
- [ ] ISC-112: CI job `test` runs `bun test tests/unit/`
- [ ] ISC-113: CI uses `oven-sh/setup-bun@v2` action
- [ ] ISC-114: CI exits non-zero if any job fails (default GitHub behavior)
- [ ] ISC-115: Anti: CI workflow does not use npm or npx

### GitHub Actions — Integration
- [ ] ISC-116: .github/workflows/integration.yml exists
- [ ] ISC-117: Integration triggers on: push to main
- [ ] ISC-118: Integration job `integration` runs `bun test tests/integration/`
- [ ] ISC-119: Integration uses secrets: H1_USERNAME, H1_API_KEY, ANTHROPIC_API_KEY
- [ ] ISC-120: Anti: integration.yml does not hardcode any credentials

### Tests
- [ ] ISC-121: tests/unit/adapters/rss.test.ts exists with ≥3 test cases
- [ ] ISC-122: RSS tests mock HTTP — no real network calls
- [ ] ISC-123: tests/unit/pipeline/dedup.test.ts exists — tests ID stability across runs
- [ ] ISC-124: tests/unit/pipeline/store.test.ts exists — verifies correct YAML+markdown output
- [ ] ISC-125: tests/integration/ directory exists with at least one placeholder test
- [ ] ISC-126: Anti: unit tests make zero real HTTP requests

### opencode Task Routing
- [ ] ISC-127: CONTRIBUTING.md documents opencode vs Claude Code task routing
- [ ] ISC-128: opencode tasks listed: adapter boilerplate, test stubs, package.json updates
- [ ] ISC-129: Claude Code tasks listed: architecture decisions, classify prompt engineering, security review

### Anti-criteria
- [ ] ISC-130: Anti: no adapter file imports from src/pipeline/ (enforced by grep)
- [ ] ISC-131: Anti: no pipeline stage imports from another stage except via types.ts
- [ ] ISC-132: Anti: credentials never appear in any source file (grep for H1_API_KEY literal)
- [ ] ISC-133: Anti: Playwright never imported or referenced in any file
- [ ] ISC-134: Anti: Python never used in any source or workflow file
- [ ] ISC-135: Anti: npm or npx never referenced in package.json scripts or workflows
- [ ] ISC-136: Anti: store.ts never overwrites an existing record
- [ ] ISC-137: Anti: classify.ts does not call any adapter directly
- [ ] ISC-138: Anti: no hardcoded store path — always env-configurable
- [ ] ISC-139: Anti: bun test exits 0 on a clean project with no test files
- [ ] ISC-140: Anti: .env file never committed (verified via .gitignore grep)

## Test Strategy

| ISC | Type | Check | Threshold | Tool |
|-----|------|-------|-----------|------|
| ISC-1–7 | structural | file exists, content matches | exact | Read + Bash ls |
| ISC-4 | build | bun tsc --noEmit exits 0 | exit 0 | Bash |
| ISC-8–19 | structural | grep for field/value in file | exact match | Bash grep |
| ISC-20–62 | structural | class exported, implements interface, no forbidden imports | exact | Read + grep |
| ISC-63–108 | structural | function exported with correct signature, no forbidden imports | exact | Read + grep |
| ISC-109–120 | structural | YAML workflow valid, correct triggers and steps | exact | Read |
| ISC-121–126 | unit test | bun test exits 0, tests contain mock patterns | exit 0 | Bash |
| ISC-127–129 | structural | CONTRIBUTING.md exists, sections present | exact | Read |
| ISC-130–140 | anti (grep) | grep returns 0 matches for forbidden pattern | 0 matches | Bash grep |

## Features

| Name | Description | Satisfies | Depends On | Parallelizable |
|------|-------------|-----------|------------|----------------|
| project-setup | package.json, tsconfig.json, .gitignore, .env.example | ISC-1–8 | — | false |
| adapter-interface | src/adapters/types.ts — SourceAdapter + RawItem | ISC-20–26 | project-setup | false |
| pipeline-types | src/pipeline/types.ts — NormalizedItem, ClassifiedItem, PipelineResult | ISC-63–67 | adapter-interface | false |
| sources-h1 | Add HackerOne to src/sources/index.ts | ISC-14–19 | project-setup | true |
| adapter-rss | RssAdapter implementation | ISC-27–34 | adapter-interface | true |
| adapter-json-api | JsonApiAdapter implementation | ISC-35–40 | adapter-interface | true |
| adapter-hackerone | HackerOneAdapter implementation | ISC-41–52 | adapter-interface | true |
| adapter-github | GithubApiAdapter implementation | ISC-53–57 | adapter-interface | true |
| adapter-arxiv | ArxivAdapter implementation | ISC-58–62 | adapter-interface | true |
| pipeline-fetch | fetchFromSources orchestrator | ISC-68–73 | pipeline-types | false |
| pipeline-classify | classify with Anthropic SDK | ISC-74–84 | pipeline-types | false |
| pipeline-dedup | dedup with content-addressed IDs | ISC-85–91 | pipeline-types | false |
| pipeline-store | store markdown+YAML writer | ISC-92–100 | pipeline-types | false |
| cli | src/cli.ts entry point | ISC-101–108 | all pipeline stages | false |
| github-ci | .github/workflows/ci.yml | ISC-109–115 | project-setup | true |
| github-integration | .github/workflows/integration.yml | ISC-116–120 | project-setup | true |
| tests-unit | Unit test stubs for adapters + pipeline | ISC-121–126 | all | true |
| contributing | CONTRIBUTING.md with opencode routing | ISC-127–129 | — | true |

## Decisions

- 2026-06-05: Project ISA at ~/Projects/threat-intel/ISA.md (not task ISA) — this is a persistent project with ongoing iterations.
- 2026-06-05: Anthropic SDK used directly in classify.ts (not PAI Inference.ts) — this is a standalone open-source project; Inference.ts is PAI-internal. ANTHROPIC_API_KEY env var pattern is identical.
- 2026-06-05: Promise.allSettled in fetch.ts (not Promise.all) — one failed adapter must not abort the entire ingestion run. Error isolation is a first-class requirement.
- 2026-06-05: HackerOne adapter uses REST API (/v1/reports) not GraphQL — REST is documented and stable; GraphQL endpoint at hackerone.com/graphql is undocumented and may break without notice.
- 2026-06-05: opencode documented as workflow guidance only (CONTRIBUTING.md), not a code dependency — tool choice is researcher preference, not architecture.
- 2026-06-05: Forge delegated adapter + pipeline implementation (E4 coding task auto-include). Paul writes interfaces and architectural contracts; Forge implements the bodies.
- 2026-06-05: Forge unavailable — codex binary not installed at ~/.bun/bin/codex. Engineer (Claude-family) substituted per Forge's own documented fallback suggestion. Deliberate substitution, noted for lineage transparency.

## Changelog

## Verification
