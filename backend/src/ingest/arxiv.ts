import { pool } from "../db/index";
import { XMLParser } from "fast-xml-parser";

type ArxivEntry = {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  author?: { name: string } | { name: string }[];
  category?: { term: string } | { term: string }[];
  link?: { href: string; title?: string; rel?: string } | { href: string; title?: string; rel?: string }[];
};

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractArxivId(idUrl: string): string {
  const parts = idUrl.split("/");
  return parts[parts.length - 1];
}

function extractPdfUrl(links: any[]): string | null {
  const pdfLink = links.find((l) => l.title === "pdf" || (l.href && l.href.includes("/pdf/")));
  return pdfLink?.href ?? null;
}

export async function ingestArxiv(category = "cs.AI", start = 0, maxResults = 100) {
  const url =
    `http://export.arxiv.org/api/query?search_query=cat:${encodeURIComponent(category)}` +
    `&start=${start}&max_results=${maxResults}`;

  console.log(`Fetching ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`arXiv fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const parsed = parser.parse(xml);
  const feed = parsed.feed;
  const entries: ArxivEntry[] = toArray(feed.entry);

  console.log(`Fetched ${entries.length} entries`);

  for (const entry of entries) {
    const authors = toArray(entry.author).map((a) => a.name);
    const categories = toArray(entry.category).map((c) => c.term);
    const links = toArray(entry.link);

    const sourceUrl = entry.id;
    const paperId = extractArxivId(entry.id);
    const pdfUrl = extractPdfUrl(links);

    await pool.query(
      `
      INSERT INTO papers (
        id, title, abstract, authors, categories,
        published_at, updated_at, pdf_url, source_url
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        abstract = EXCLUDED.abstract,
        authors = EXCLUDED.authors,
        categories = EXCLUDED.categories,
        published_at = EXCLUDED.published_at,
        updated_at = EXCLUDED.updated_at,
        pdf_url = EXCLUDED.pdf_url,
        source_url = EXCLUDED.source_url
      `,
      [
        paperId,
        entry.title?.replace(/\s+/g, " ").trim() ?? "",
        entry.summary?.replace(/\s+/g, " ").trim() ?? "",
        authors,
        categories,
        entry.published,
        entry.updated,
        pdfUrl,
        sourceUrl,
      ]
    );
  }

  console.log(`Inserted/updated ${entries.length} papers`);
}