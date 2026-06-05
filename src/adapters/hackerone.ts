import type { SourceAdapter, RawItem } from "./types.js";

interface H1Report {
  id: string;
  type: string;
  attributes: {
    title: string;
    state: string;
    disclosed_at?: string;
    latest_disclosable_activity_at?: string;
    vulnerability_information?: string;
    severity?: { rating?: string };
    weakness?: { external_id?: string };
  };
}

interface H1Response {
  data: H1Report[];
  links?: { next?: string };
}

export class HackerOneAdapter implements SourceAdapter {
  readonly sourceId = "hackerone";

  private getAuth(): string {
    const username = process.env["H1_USERNAME"];
    const apiKey = process.env["H1_API_KEY"];
    if (!username || !apiKey) {
      throw new Error(
        "HackerOne credentials missing — set H1_USERNAME and H1_API_KEY environment variables. " +
        "Create an API token at: https://hackerone.com/settings/api_token/edit"
      );
    }
    return `Basic ${Buffer.from(`${username}:${apiKey}`).toString("base64")}`;
  }

  async *fetchSince(since: Date): AsyncIterable<RawItem> {
    const auth = this.getAuth();
    let url: string | undefined =
      "https://api.hackerone.com/v1/reports?" +
      "filter%5Bstate%5D%5B%5D=disclosed" +
      "&sort_type=latest_disclosable_at&sort_direction=desc" +
      "&page%5Bsize%5D=100";

    while (url) {
      let res: Response;
      try {
        res = await fetch(url, {
          headers: {
            Authorization: auth,
            Accept: "application/json",
          },
        });
      } catch (err) {
        console.error(`[HackerOne] network error: ${(err as Error).message}`);
        return;
      }

      if (res.status === 401) {
        console.error("[HackerOne] 401 Unauthorized — check H1_USERNAME and H1_API_KEY");
        return;
      }
      if (!res.ok) {
        console.error(`[HackerOne] HTTP ${res.status} — stopping pagination`);
        return;
      }

      const body = (await res.json()) as H1Response;
      let hitSinceWall = false;

      for (const report of body.data) {
        const disclosedAt = report.attributes.disclosed_at ?? report.attributes.latest_disclosable_activity_at;
        if (!disclosedAt) continue;

        const published = new Date(disclosedAt);
        if (published <= since) { hitSinceWall = true; break; }

        const rawContent =
          report.attributes.vulnerability_information?.trim() ||
          report.attributes.title;

        yield {
          title: report.attributes.title,
          url: `https://hackerone.com/reports/${report.id}`,
          published,
          rawContent,
          sourceName: "HackerOne Disclosed Reports",
          sourceTier: 2,
          rawCve: report.attributes.weakness?.external_id,
          rawSeverity: report.attributes.severity?.rating,
        };
      }

      url = hitSinceWall ? undefined : body.links?.next;
    }
  }
}
