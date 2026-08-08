import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { prisma } from "@spring-lane/db";
import { auth } from "./auth.js";
import { config } from "./config.js";
import { appsRouter } from "./routes/apps.js";
import { reposRouter } from "./routes/repos.js";

const app = express();

app.use(
  cors({
    origin: config.webUrl,
    credentials: true,
  }),
);

// Better Auth must be mounted before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "api", db: true });
  } catch {
    res.status(503).json({ ok: false, service: "api", db: false });
  }
});

app.get("/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json(session);
});

app.use("/repos", reposRouter);
app.use("/apps", appsRouter);

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`[api] listening on :${config.port}`);
});
