import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { apiRouter } from "./server/apiRouter.ts";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === "production";

  // Body parsing
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Mount API endpoints first so they are never intercepted by Vite HTML fallback
  app.use("/api", apiRouter);

  // Return JSON 404 for unhandled /api calls instead of HTML
  app.use("/api", (req, res) => { res.status(404).json({ error: "API endpoint not found: " + req.method + " " + req.originalUrl }); });

  if (!isProd) {
    // Development mode: mount Vite middleware
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
        watch: process.env.DISABLE_HMR === "true" ? null : {},
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: serve built static files
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FurniCraft AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
