import type { Request, Response } from "express";
import type { GatewayClient } from "../gateway/client.js";
import { getRun, addSseClient, removeSseClient } from "../state/run-tracker.js";

/**
 * GET /v1/runs/:runId/events — SSE event stream
 */
export function createRunEventsHandler() {
  return (req: Request, res: Response) => {
    const runId = String(req.params.runId);
    const state = getRun(runId);
    if (!state) {
      res.status(404).json({ error: "run not found" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send cached history first
    for (const event of state.events) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // If run is already terminal, close immediately
    if (state.status === "completed" || state.status === "aborted" || state.status === "failed") {
      res.write(`data: ${JSON.stringify({ type: "stream.end" })}\n\n`);
      res.end();
      return;
    }

    // Register for live events
    addSseClient(runId, res);

    req.on("close", () => {
      removeSseClient(runId, res);
    });
  };
}

/**
 * POST /v1/runs/:runId/abort
 */
export function createRunAbortHandler(gateway: GatewayClient) {
  return async (req: Request, res: Response) => {
    const runId = String(req.params.runId);
    const state = getRun(runId);
    if (!state) {
      res.status(404).json({ error: "run not found" });
      return;
    }

    try {
      await gateway.request("chat.abort", { sessionKey: state.sessionKey, runId });
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({
        error: "abort failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}

/**
 * GET /v1/runs/:runId/result?timeout=30000
 */
export function createRunResultHandler(gateway: GatewayClient) {
  return async (req: Request, res: Response) => {
    const runId = String(req.params.runId);
    const state = getRun(runId);
    if (!state) {
      res.status(404).json({ error: "run not found" });
      return;
    }

    const timeout = Number(req.query.timeout) || 30_000;

    try {
      const result = await gateway.request("agent.wait", {
        runId,
        timeoutMs: timeout,
      });
      res.json({ runId, status: state.status, result });
    } catch (err) {
      res.status(504).json({
        error: "wait timed out or failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
