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
        const preferredModel =
          typeof process.env.WEBBOT_SIDECAR_MODEL === "string" &&
          process.env.WEBBOT_SIDECAR_MODEL.trim().length > 0
            ? process.env.WEBBOT_SIDECAR_MODEL.trim()
            : undefined;
        await gateway.request("sessions.patch", {
          key: sessionKey,
          verboseLevel: "full",
          ...(preferredModel ? { model: preferredModel } : {}),
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
        // Some OpenAI-compatible models (notably certain internal/Qwen deployments)
        // may leak tool calls as plain XML-ish text like:
        // <function=xlsx>...<parameter=...>...</tool_call>
        // This prompt nudges the model to use structured tool calling instead.
        extraSystemPrompt:
          "当需要调用工具时，必须使用模型的结构化工具调用机制，不要在文本中输出类似 <function=...> 或 <parameter=...> 或 </tool_call> 的标签。若需要操作 Excel，请直接调用 xlsx 工具。",
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
