import type { EventFrame } from "../gateway/types.js";
import type { ProductEvent } from "./types.js";

/**
 * Gateway agent event structure:
 *   { type: "event", event: "agent", payload: { runId, stream, ts, data, sessionKey, seq } }
 *
 * payload.stream: "lifecycle" | "assistant" | "tool" | "error"
 * payload.data: the actual event data (phase, delta, name, result, etc.)
 */

type AgentPayload = {
  runId?: string;
  stream?: string;
  ts?: number;
  data?: Record<string, unknown>;
  sessionKey?: string;
  seq?: number;
};

/**
 * Maps a gateway event frame to zero or more product events.
 * Returns empty array if the event is not relevant to any active run.
 */
export function mapGatewayEvent(
  evt: EventFrame,
  resolveRunId: (sessionKey: string) => string | undefined,
): ProductEvent[] {
  // Only handle "agent" events
  if (evt.event !== "agent") {
    return [];
  }

  const payload = (evt.payload ?? {}) as AgentPayload;
  const sessionKey = typeof payload.sessionKey === "string" ? payload.sessionKey : "";
  const runId = resolveRunId(sessionKey);
  if (!runId) {
    return [];
  }

  const stream = payload.stream;
  const data = payload.data ?? {};
  const now = Date.now();

  if (stream === "lifecycle") {
    const phase = data.phase as string | undefined;
    const aborted = Boolean(data.aborted);
    if (phase === "start") {
      return [{ type: "run.started", runId, conversationId: "", timestamp: now }];
    }
    if (phase === "end" && !aborted) {
      return [{ type: "run.completed", runId, timestamp: now }];
    }
    if (phase === "end" && aborted) {
      return [{ type: "run.aborted", runId, timestamp: now }];
    }
    if (phase === "error") {
      const error = typeof data.error === "string" ? data.error : "unknown error";
      return [{ type: "run.failed", runId, error, timestamp: now }];
    }
  }

  if (stream === "assistant") {
    const delta = typeof data.delta === "string" ? data.delta : undefined;
    if (delta !== undefined) {
      return [{ type: "assistant.delta", runId, delta, timestamp: now }];
    }
  }

  if (stream === "tool") {
    const phase = data.phase as string | undefined;
    const toolName = typeof data.name === "string" ? data.name : "unknown";
    const toolCallId = typeof data.toolCallId === "string" ? data.toolCallId : undefined;
    if (phase === "start") {
      return [{ type: "tool.started", runId, toolName, toolCallId, timestamp: now }];
    }
    if (phase === "update") {
      return [
        { type: "tool.updated", runId, toolCallId, data: data.partialResult ?? data.data, timestamp: now },
      ];
    }
    // Detect tool completion by phase OR by presence of result data.
    // The gateway strips data.result when verboseLevel != "full",
    // so we must also check phase === "result".
    if (phase === "result" || data.result !== undefined) {
      return [{ type: "tool.result", runId, toolCallId, result: data.result, timestamp: now }];
    }
  }

  if (stream === "error") {
    const error = typeof data.message === "string" ? data.message : "unknown error";
    return [{ type: "run.failed", runId, error, timestamp: now }];
  }

  return [];
}
