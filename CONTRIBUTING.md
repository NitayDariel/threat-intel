# Contributing to threat-intel

## Tool Routing

This project uses two AI coding tools. Choose based on task type:

### Use opencode (cheaper, faster)
- Creating a new adapter from the existing template (copy `rss.ts`, change feed URL + field mapping)
- Generating test stubs for a new adapter
- Updating `package.json` dependencies
- Reformatting or renaming files

### Use Claude Code
- Architecture decisions (new pipeline stage, schema change)
- Tuning the classification prompt in `src/pipeline/classify.ts`
- Debugging coupling violations (import from wrong layer)
- Security review of adapter authentication logic
- Updating the ISA (`ISA.md`)

### Never use
- **Playwright** — banned. Use `fetch()` for HTTP, the `Browser` skill for authenticated scraping
- **npm or npx** — always `bun` / `bunx`
- **Python** — TypeScript only
- **Hardcoded credentials** — env vars only, documented in `.env.example`

## Project Structure

```
src/
├── adapters/        ← fetch raw items from sources (NO pipeline imports)
├── pipeline/        ← classify, dedup, store (NO cross-stage imports)
├── sources/         ← source definitions + feed URLs
├── types/           ← ThreatIntelRecord interface
├── vocab/           ← controlled vocabulary enums
└── cli.ts           ← entry point (only file that imports from both layers)
```

## Coupling Rules (CI enforced)

1. `src/adapters/*.ts` — must NOT import from `src/pipeline/`
2. `src/pipeline/*.ts` — must NOT import from another pipeline stage
3. `src/cli.ts` — the only file allowed to import from both layers
4. Credentials come from `process.env` only — never hardcoded

## Adding a New Source

1. Add an entry to `src/sources/index.ts` with `name`, `feed_url`, `format`, `tier`, `domain_coverage`
2. If the format is RSS/Atom, no new adapter needed — `RssAdapter` handles it
3. For a new API format, create `src/adapters/{name}.ts` implementing `SourceAdapter`
4. Wire the adapter in the `buildAdapter` switch in `src/cli.ts`
5. Add a unit test in `tests/unit/adapters/{name}.test.ts`

## Running

```bash
cp .env.example .env   # fill in credentials
bun run ingest --since 2026-06-01
bun run ingest --source "project-zero,hackerone" --dry-run
bun run typecheck
bun run test
```
