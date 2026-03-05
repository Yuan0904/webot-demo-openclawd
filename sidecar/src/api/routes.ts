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
