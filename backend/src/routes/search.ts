import { Router } from "express";
import { pool } from "../db/index";

export const searchRouter = Router();

searchRouter.get("/", async (req, res) => {
  const q        = String(req.query.q || "").trim();
  const page     = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)));
  const sort     = req.query.sort === "date" ? "date" : "relevance";
  const offset   = (page - 1) * pageSize;

  if (!q) {
    return res.json({ total: 0, page, pageSize, results: [] });
  }

  try {
    const countSql = `
      WITH query AS (SELECT websearch_to_tsquery('english', $1) AS q)
      SELECT COUNT(*)::int AS total
      FROM papers p, query
      WHERE p.content_tsv @@ query.q;
    `;
    const countResult = await pool.query(countSql, [q]);
    const total = countResult.rows[0]?.total ?? 0;

    const orderBy = sort === "date"
      ? "p.published_at DESC NULLS LAST, rank DESC"
      : "rank DESC, p.published_at DESC NULLS LAST";

    const searchSql = `
      WITH query AS (SELECT websearch_to_tsquery('english', $1) AS q)
      SELECT
        p.id,
        p.title,
        p.authors,
        p.categories,
        p.published_at AS "publishedAt",
        p.pdf_url      AS "pdfUrl",
        p.source_url   AS "sourceUrl",
        ts_rank_cd(p.content_tsv, query.q) AS rank,
        ts_headline(
          'english',
          p.abstract,
          query.q,
          'MaxFragments=2, MinWords=10, MaxWords=30'
        ) AS snippet
      FROM papers p, query
      WHERE p.content_tsv @@ query.q
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3;
    `;

    const t0      = process.hrtime.bigint();
    const results = await pool.query(searchSql, [q, pageSize, offset]);
    const t1      = process.hrtime.bigint();
    const latencyMs = Number(t1 - t0) / 1_000_000;

    console.log(`search "${q}" sort=${sort} took ${latencyMs.toFixed(2)} ms`);

    res.json({
      total,
      page,
      pageSize,
      sort,
      latencyMs: Number(latencyMs.toFixed(2)),
      results: results.rows,
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});