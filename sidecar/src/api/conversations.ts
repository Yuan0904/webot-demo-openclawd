import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { GatewayClient } from "../gateway/client.js";
import { createRun, deleteRun } from "../state/run-tracker.js";
import {
  getOrCreateSessionKey,
  isSessionConfigured,
  markSessionConfigured,
} from "../state/session-map.js";

export function createConversationsHandler(gateway: GatewayClient) {
  /**
   * POST /v1/conversations/:id/runs
   * Body: { text: string, agentId?: string }
   */
  return async (req: Request, res: Response) => {
    const conversationId = String(req.params.id);
    const { text, agentId } = req.body as {
      text?: string;
      agentId?: string;
    };

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const sessionKey = getOrCreateSessionKey(conversationId);
    const runId = randomUUID();

    // Ensure verboseLevel is "full" so tool results are included in events
    if (!isSessionConfigured(sessionKey)) {
      try {
        await gateway.request("sessions.patch", {
          key: sessionKey,
          verboseLevel: "full",
        });
        markSessionConfigured(sessionKey);
      } catch {
        // Non-fatal: tool results may be missing but execution still works
      }
    }

    // Create run BEFORE sending to gateway so early events aren't lost
    createRun({ runId, conversationId, sessionKey });

    try {
      await gateway.request("agent", {
        message: text,
        agentId: agentId ?? undefined,
        sessionKey,
        deliver: false,
        idempotencyKey: runId,
      });

      res.status(202).json({ runId, status: "accepted" } as const);
    } catch (err) {
      // Clean up the pre-created run on failure
      deleteRun(runId);
      res.status(502).json({
        error: "gateway request failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
