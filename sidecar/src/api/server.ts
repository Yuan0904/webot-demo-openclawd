import express, { type Express } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GatewayClient } from "../gateway/client.js";
import { registerRoutes } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createHttpServer(gateway: GatewayClient): Express {
  const app = express();

  // CORS
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (_req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());

  // Static files (public directory is at src/public relative to this file's parent)
  const publicDir = path.resolve(__dirname, "..", "public");
  app.use(express.static(publicDir));

  registerRoutes(app, gateway);
  return app;
}
