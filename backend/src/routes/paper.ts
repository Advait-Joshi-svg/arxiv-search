import { Router } from "express";
import { pool } from "../db/index";

export const paperRouter = Router();

paperRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
        id,
        title,
        abstract,
        authors,
        categories,
        published_at AS "publishedAt",
        pdf_url      AS "pdfUrl",
        source_url   AS "sourceUrl"
      FROM papers
      WHERE id = $1
      LIMIT 1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Paper not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Paper fetch error:", err);
    res.status(500).json({ error: "Failed to fetch paper" });
  }
});