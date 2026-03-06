import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { searchRouter } from "./routes/search";
import { pool } from "./db";
import { ingestRouter } from "./routes/ingest";
import { paperRouter } from "./routes/paper";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/search", searchRouter);
app.use("/api/ingest", ingestRouter);
app.use("/api/papers", paperRouter);

app.get("/health", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS db, current_user AS user"
    );

    res.json({
      ok: true,
      db: result.rows[0].db,
      user: result.rows[0].user
    });

  } catch (err) {
    console.error("DB connection error:", err);

    res.status(500).json({
      ok: false,
      error: "Database connection failed"
    });
  }
});

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});