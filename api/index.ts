import express from "express";
import dotenv from "dotenv";
import { router as apiRouter } from "../server/routes.ts";
import { getDb, getSupabaseStatus } from "../server/db.ts";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Eagerly trigger DB initialization in background
getDb().catch((err) => {
  console.error("Database initialization error:", err);
});

// Health check endpoint
app.get("/api/health", async (_req, res) => {
  try {
    const supabase = await getSupabaseStatus();
    res.json({ status: "ok", supabase });
  } catch {
    res.json({ status: "ok" });
  }
});
app.get("/health", async (_req, res) => {
  try {
    const supabase = await getSupabaseStatus();
    res.json({ status: "ok", supabase });
  } catch {
    res.json({ status: "ok" });
  }
});

// Debug request logging
app.use((req, _res, next) => {
  console.log(`DEBUG [Vercel API]: ${req.method} ${req.url}`);
  next();
});

// Mount router on both /api and / to handle any rewrite configuration
app.use("/api", apiRouter);
app.use("/", apiRouter);

export default app;
