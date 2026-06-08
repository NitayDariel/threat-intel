# threat-intel

> **Threat intelligence aggregator — ingest, classify, and export AI-ready security research context.**

A lightweight, `bun`-native CLI pipeline for solo security researchers. Run `bun run ingest` and within minutes you have a directory of clean markdown files — each a structured record with YAML frontmatter, LLM-generated summary, and researcher-derived classification. Paste the folder into a Claude Code session and your agent has the current state of the art on your target domain.

**No server. No Docker. No enterprise license.** Just a folder of markdown you can `git-commit`, diff, and share.

---

## Overview

- Fetches from **11+ security research sources**: Google Project Zero, GitHub Security Lab, CISA KEV, Zero Day Initiative, PortSwigger, Trail of Bits, watchTowr, Synacktiv, ArXiv cs.CR, HackerOne, NVD
- Classifies every record with an LLM using a **researcher-derived controlled vocabulary** (target domain, attack surface, kill-chain stage, evidence quality)
- **Deduplicates** across re-runs by content-addressed ID
- Writes **AI-ready markdown** with YAML frontmatter to the filesystem
- Lightweight TypeScript + bun, zero external infrastructure

## Quick Start

```bash
# 1. Credentials
cp .env.example .env
# Edit .env with your H1_USERNAME, H1_API_KEY, and ANTHROPIC_API_KEY

# 2. Install dependencies
bun install

# 3. Run the ingestor (last 7 days, all sources)
bun run ingest

# 4. Run with filters
bun run ingest --since 2026-06-01 --source project-zero,hackerone
bun run ingest --source project-zero --dry-run
```

Records land in `~/.threat-intel/records/` by default (override via `INTEL_STORE_PATH`).

---

## Architecture

```
src/
├── adapters/      ← fetch raw items from sources (RSS, REST, JSON-API)
├── pipeline/
│   ├── fetch.ts   ← orchestrates adapters concurrently with error isolation
│   ├── classify.ts← Anthropic LLM batch classifier with structured output
│   ├── dedup.ts   ← content-addressed ID deduplication across runs
│   └── store.ts   ← YAML frontmatter + markdown writer
├── types/         ← ThreatIntelRecord, shared interfaces
├── vocab/         ← controlled vocabulary enums (domain, surface, stage, type)
├── sources/       ← source definitions + metadata
└── cli.ts         ← entry point (--since, --source, --dry-run)
```

**Coupling rules:**
- Adapters never import from pipeline stages.
- Pipeline stages never import from each other (only via shared `types.ts`).
- `cli.ts` is the only file allowed to wire both layers together.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | — | For LLM classification |
| `H1_USERNAME` | *For H1 source* | — | HackerOne API username |
| `H1_API_KEY` | *For H1 source* | — | HackerOne API token |
| `GITHUB_TOKEN` | No | — | Higher rate limits on GitHub adapter |
| `INTEL_STORE_PATH` | No | `~/.threat-intel/records` | Output directory |
| `CLASSIFY_BATCH_SIZE` | No | `10` | Records per LLM API call |

## Data Model

Each record is a markdown file with YAML frontmatter:

```markdown
---
id: a3f8c291b7d2e104
title: "Project Zero: 802.11 OOB Read via malformed beacon frame"
source_url: "https://googleprojectzero.blogspot.com/..."
published: "2024-11-03"
ingested: "2026-06-05T14:00:00Z"
cve: "CVE-2024-XXXXX"
target_domain: wifi-protocols
attack_surface: [network, parser]
chain_stage: [initial-access, execution]
has_poc: true
exploited_in_wild: false
source_tier: 1
source_type: disclosure
summary: "3-5 sentence LLM synthesis..."
---

## Summary
...

## Key Insight
...

## Source
[Project Zero](https://googleprojectzero.blogspot.com/...)
```

## Controlled Vocabulary

- **Target Domain** (17 values): `wifi-protocols`, `linux-kernel`, `web-api`, `llm-inference`, `browser-sandbox`, `v8-engine`, `android-binder`, …
- **Attack Surface** (10 values): `heap`, `stack`, `parser`, `network`, `ipc`, `filesystem`, `api`, `supply-chain`, `logic`, `side-channel`
- **Chain Stage** (9 values): `initial-access`, `execution`, `privilege-escalation`, `sandbox-escape`, `defense-evasion`, …
- **Source Type**: `disclosure`, `advisory`, `paper`, `blog`, `audit-report`, `poc-release`
- **Source Tier**: `1` (elite researcher/lab), `2` (known firm/blog), `3` (community/volume)

## Scripts

| Script | What it does |
|--------|--------------|
| `bun run ingest` | Full pipeline: fetch → classify → dedup → store |
| `bun run typecheck` | `tsc --noEmit` strict check |
| `bun test` | All unit + integration tests |
| `bun run test:unit` | Unit tests only |
| `bun run test:integration` | Live adapter smoke tests |

## CI/CD

- **`.github/workflows/ci.yml`** — runs on pull requests: typecheck + unit tests
- **`.github/workflows/integration.yml`** — runs on `main` push: live integration tests (requires secrets)

## Tool Routing

This project uses both Claude Code and opencode for development:

- **opencode** – adapter boilerplate, test stubs, dependency updates
- **Claude Code** – architecture decisions, prompt engineering, security review

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for full guidelines.

## Design Constraints

- **TypeScript + bun only** — no Python, no npm, no npx
- **No Playwright** — HTTP via `fetch()` only
- **Credentials live exclusively in env vars** — never hardcoded
- **Filesystem is the database** — no SQLite/ORM in v1
- **Idempotency** — running twice on the same source produces the same store state
- **No web UI** — v1 is CLI-only

## License

MIT
