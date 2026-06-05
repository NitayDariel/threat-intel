import type { TargetDomain } from "../vocab/target-domain.js";

export interface SourceDefinition {
  name: string;
  feed_url: string;
  format: "rss" | "atom" | "json-api" | "rest-api" | "github-api" | "arxiv-api";
  tier: 1 | 2 | 3;
  domain_coverage: TargetDomain[];
  update_cadence: "continuous" | "daily" | "weekly" | "ad-hoc";
  notes?: string;
}

export const SOURCES: SourceDefinition[] = [
  {
    name: "Google Project Zero",
    feed_url: "https://googleprojectzero.blogspot.com/feeds/posts/default",
    format: "atom",
    tier: 1,
    domain_coverage: [
      "wifi-protocols", "network-protocols", "browser-sandbox",
      "android-binder", "macos-xnu", "windows-kernel", "v8-engine",
    ],
    update_cadence: "ad-hoc",
    notes: "Highest signal density. Full root-cause analysis. Tag by researcher for domain routing.",
  },
  {
    name: "GitHub Security Lab (GHSL)",
    feed_url: "https://securitylab.github.com/advisories/feed.xml",
    format: "atom",
    tier: 1,
    domain_coverage: ["supply-chain", "python-runtime", "jvm", "container-runtime"],
    update_cadence: "ad-hoc",
    notes: "Parser and runtime focus. Use GitHub API — no RSS. Filter by 'publication' label.",
  },
  {
    name: "NVD CVE API",
    feed_url: "https://services.nvd.nist.gov/rest/json/cves/2.0",
    format: "json-api",
    tier: 3,
    domain_coverage: [
      "linux-kernel", "windows-kernel", "network-protocols",
      "web-api", "supply-chain", "container-runtime",
    ],
    update_cadence: "continuous",
    notes: "Volume source. Data quality is Tier 3 — use for CVE cross-referencing, not as primary summary source. Paginate with pubStartDate/pubEndDate.",
  },
  {
    name: "CISA Known Exploited Vulnerabilities",
    feed_url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    format: "json-api",
    tier: 1,
    domain_coverage: [
      "network-protocols", "linux-kernel", "windows-kernel",
      "web-api", "container-runtime",
    ],
    update_cadence: "daily",
    notes: "Source of truth for exploited_in_wild=true. Cross-reference against existing records by CVE ID.",
  },
  {
    name: "Zero Day Initiative (ZDI)",
    feed_url: "https://www.zerodayinitiative.com/rss/published/",
    format: "rss",
    tier: 2,
    domain_coverage: [
      "windows-kernel", "network-protocols", "browser-sandbox",
      "linux-kernel", "macos-xnu",
    ],
    update_cadence: "weekly",
    notes: "Broad OS and application coverage. Write-ups lighter than P0 but structured.",
  },
  {
    name: "PortSwigger Research",
    feed_url: "https://portswigger.net/research/rss",
    format: "rss",
    tier: 2,
    domain_coverage: ["web-api", "browser-sandbox", "network-protocols"],
    update_cadence: "ad-hoc",
    notes: "Deep web security research. HTTP desync, smuggling, prototype pollution. High write-up quality.",
  },
  {
    name: "Trail of Bits Blog",
    feed_url: "https://blog.trailofbits.com/feed/",
    format: "rss",
    tier: 2,
    domain_coverage: [
      "blockchain-contracts", "llm-inference", "linux-kernel",
      "supply-chain", "ai-supply-chain",
    ],
    update_cadence: "weekly",
    notes: "Broad firm with AI security + blockchain + systems focus. Audit reports are high-value.",
  },
  {
    name: "watchTowr Labs",
    feed_url: "https://labs.watchtowr.com/rss/",
    format: "rss",
    tier: 2,
    domain_coverage: ["network-protocols", "web-api", "linux-kernel", "container-runtime"],
    update_cadence: "weekly",
    notes: "Active disclosure research. High write-up quality with reproduction steps. Good for has_poc signal.",
  },
  {
    name: "ArXiv cs.CR",
    feed_url: "https://rss.arxiv.org/rss/cs.CR",
    format: "rss",
    tier: 2,
    domain_coverage: ["llm-inference", "ai-supply-chain", "network-protocols", "side-channel"],
    update_cadence: "daily",
    notes: "Academic AI security and crypto papers. Filter by keyword relevance — high volume, mixed signal.",
  },
  {
    name: "Synacktiv Blog",
    feed_url: "https://www.synacktiv.com/en/feed/lastblog.xml",
    format: "atom",
    tier: 2,
    domain_coverage: [
      "android-binder", "linux-kernel", "macos-xnu",
      "browser-sandbox", "container-runtime",
    ],
    update_cadence: "ad-hoc",
    notes: "French offensive security firm. Deep technical write-ups. Strong mobile and kernel coverage.",
  },
  {
    name: "HackerOne Disclosed Reports",
    feed_url: "https://api.hackerone.com/v1/reports",
    format: "rest-api",
    tier: 2,
    domain_coverage: [
      "web-api", "network-protocols", "supply-chain",
      "linux-kernel", "container-runtime", "blockchain-contracts",
    ],
    update_cadence: "continuous",
    notes: "REST API — Basic auth (H1_USERNAME:H1_API_KEY). Query: filter[state][]=disclosed, sort by latest_disclosable_at DESC. Paginate via links.next. No public RSS exists.",
  },
];
