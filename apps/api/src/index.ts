import http from "node:http";
import express from "express";
import cors from "cors";
import { config } from "./config.js";

const app = express();

app.use(cors({ origin: config.webUrl, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`[api] listening on :${config.port}`);
});
