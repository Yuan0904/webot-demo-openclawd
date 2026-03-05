import type { Express } from "express";
import type { GatewayClient } from "../gateway/client.js";
import { listRunsForConversation } from "../state/run-tracker.js";
import { createConversationsHandler } from "./conversations.js";
import { createRunEventsHandler, createRunAbortHandler, createRunResultHandler } from "./runs.js";

export function registerRoutes(app: Express, gateway: GatewayClient) {
  // Conversations
  app.post("/v1/conversations/:id/runs", createConversationsHandler(gateway));

  app.get("/v1/conversations/:id/history", (req, res) => {
    const conversationId = String(req.params.id);
    const runs = listRunsForConversation(conversationId);
    res.json({
      conversationId,
      runs: runs.map((r) => ({
        runId: r.runId,
        status: r.status,
        eventCount: r.events.length,
        createdAt: r.createdAt,
      })),
    });
  });

  // Runs
  app.get("/v1/runs/:runId/events", createRunEventsHandler());
  app.post("/v1/runs/:runId/abort", createRunAbortHandler(gateway));
  app.get("/v1/runs/:runId/result", createRunResultHandler(gateway));

  // Debug: office versioning
  app.post("/v1/debug/office-version/create", async (req, res) => {
    const { filePath, versionType, taskId, createdBy } = req.body as {
      filePath?: string;
      versionType?: "before_ai" | "after_ai";
      taskId?: string;
      createdBy?: "ai" | "system";
    };

    if (!filePath || typeof filePath !== "string") {
      res.status(400).json({ error: "filePath is required" });
      return;
    }

    try {
      const result = await gateway.request("skills.office.version.create", {
        filePath,
        versionType,
        taskId,
        createdBy,
      });
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: "create office version failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.get("/v1/debug/office-version/list", async (req, res) => {
    const filePath = typeof req.query.filePath === "string" ? req.query.filePath.trim() : "";
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const limit = Number.isFinite(limitRaw) ? Number(limitRaw) : undefined;
    if (!filePath) {
      res.status(400).json({ error: "filePath is required" });
      return;
    }

    try {
      const result = await gateway.request("skills.office.version.list", {
        filePath,
        limit,
      });
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: "list office versions failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.post("/v1/debug/office-version/restore", async (req, res) => {
    const { filePath, versionId, markCurrent } = req.body as {
      filePath?: string;
      versionId?: string;
      markCurrent?: boolean;
    };

    if (!filePath || typeof filePath !== "string") {
      res.status(400).json({ error: "filePath is required" });
      return;
    }
    if (!versionId || typeof versionId !== "string") {
      res.status(400).json({ error: "versionId is required" });
      return;
    }

    try {
      const result = await gateway.request("skills.office.version.restore", {
        filePath,
        versionId,
        markCurrent: markCurrent !== false,
      });
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: "restore office version failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Health
  app.get("/health", (_req, res) => {
    const policy = gateway.policy;
    res.json({
      ok: true,
      gateway: {
        connected: policy !== null,
        policy: policy ?? undefined,
      },
    });
  });
}
