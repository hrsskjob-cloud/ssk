import express from "express";
import path from "path";
import dotenv from "dotenv";
import { router as apiRouter } from "./server/routes.ts";
import { getDb, getSupabaseStatus } from "./server/db.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize DB in background
  getDb().then(() => console.log("Database initialized")).catch(console.error);

  // Health check
  app.get("/api/health", async (_req, res) => {
    try {
      const supabase = await getSupabaseStatus();
      res.json({ status: "ok", supabase });
    } catch {
      res.json({ status: "ok" });
    }
  });

  // Mount main API router
  app.use("/api", apiRouter);

  // In development, mount Vite middleware for live SPA rendering
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SSK Job Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
