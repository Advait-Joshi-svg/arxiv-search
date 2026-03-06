import { Router } from "express";
import { ingestArxiv } from "../ingest/arxiv";

export const ingestRouter = Router();

ingestRouter.post("/arxiv", async (req, res) => {
  const category = String(req.body.category || "cs.AI");
  const start = Number(req.body.start || 0);
  const maxResults = Math.min(500, Math.max(1, Number(req.body.maxResults || 100)));

  try {
    await ingestArxiv(category, start, maxResults);
    res.json({
      ok: true,
      message: `Ingested arXiv papers for ${category}`,
      category,
      start,
      maxResults,
    });
  } catch (err) {
    console.error("Ingestion error:", err);
    res.status(500).json({ ok: false, error: "Ingestion failed" });
  }
});