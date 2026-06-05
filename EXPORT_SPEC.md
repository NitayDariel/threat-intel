# Export Directory Specification

## Record Filename Convention

Each record is a single markdown file. Filename is derived from the record ID:

```
{id-prefix-8chars}-{title-slug}.md
```

Example: `a3f8c291-project-zero-v8-type-confusion-rce.md`

- `id-prefix`: first 8 hex chars of the content-addressed ID
- `title-slug`: lowercase, hyphens, max 48 chars, truncated at word boundary

## Export Directory Structure

When you run `intel export --domain wifi-protocols --tier 1,2`, the output is a self-contained folder:

```
export-wifi-protocols-2026-06-05/
├── index.md                          # human-readable summary of this export
├── records/
│   ├── a3f8c291-p0-80211-oob-read.md
│   ├── b7d2e104-zdi-wpa3-auth-bypass.md
│   └── ...
└── meta/
    ├── query.json                    # the filter used to produce this export
    └── sources.json                  # which sources contributed records
```

## index.md Format

```markdown
# Threat Intel Export — wifi-protocols (Tier 1+2)
Generated: 2026-06-05T14:32:00Z | Records: 23 | Sources: 4

## Summary
[3-sentence AI-generated synthesis of what this corpus covers]

## Records by Chain Stage
- initial-access (8): ...
- privilege-escalation (6): ...

## Records by Attack Surface
- network (14): ...
- parser (9): ...

## Files
- [a3f8c291](records/a3f8c291-p0-80211-oob-read.md) — Project Zero: 802.11 OOB Read via malformed beacon frame (2024-11-03)
- ...
```

## Record File Format

```markdown
---
id: a3f8c291b7d2e104
title: "Project Zero: 802.11 OOB Read via malformed beacon frame"
source_url: "https://googleprojectzero.blogspot.com/..."
published: "2024-11-03"
ingested: "2026-06-05T14:00:00Z"
cwe: ["CWE-125"]
cvss_score: 9.1
cve: "CVE-2024-XXXXX"
target_domain: wifi-protocols
attack_surface: [network, parser]
chain_stage: [initial-access, execution]
has_poc: true
has_full_exploit: false
patch_available: true
exploited_in_wild: false
source_tier: 1
source_type: disclosure
researcher: ["jann-horn"]
tags: ["beacon-frame", "nl80211", "oob-read"]
related_ids: []
---

## Summary
[3-5 sentence LLM synthesis stored at ingest time]

## Key Insight
[Single most important takeaway for a researcher]

## Source
[Project Zero](https://googleprojectzero.blogspot.com/...)
```

## Multi-Dimension Export

Records are stored once in the canonical store (`~/.threat-intel/records/`). Export is a filtered copy — no symlinks, no database. The export folder is self-contained and droppable into any AI agent session.

## AI Context Usage

Drop the export folder into a Claude Code session:

```
Here is a curated corpus of threat intel records relevant to our target:
[paste contents of index.md]

Records are in the records/ directory. Each has structured frontmatter and a researcher-written summary.
```

Or reference specific records directly by reading individual `.md` files.
