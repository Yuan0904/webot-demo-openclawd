import type { Response } from "express";
import type { ProductEvent } from "../bridge/types.js";

export type RunStatus = "accepted" | "running" | "completed" | "aborted" | "failed";

export type RunState = {
  runId: string;
  conversationId: string;
  sessionKey: string;
  status: RunStatus;
  events: ProductEvent[];
  sseClients: Set<Response>;
  lastPayloadSeq: number;
  createdAt: number;
};

const runs = new Map<string, RunState>();
/** Maps sessionKey → runId for active runs */
const activeBySession = new Map<string, string>();

export function createRun(params: {
  runId: string;
  conversationId: string;
  sessionKey: string;
}): RunState {
  const state: RunState = {
    runId: params.runId,
    conversationId: params.conversationId,
    sessionKey: params.sessionKey,
    status: "accepted",
    events: [],
    sseClients: new Set(),
    lastPayloadSeq: -1,
    createdAt: Date.now(),
  };
  runs.set(params.runId, state);
  activeBySession.set(params.sessionKey, params.runId);
  return state;
}

export function deleteRun(runId: string) {
  const state = runs.get(runId);
  if (!state) {
    return;
  }
  activeBySession.delete(state.sessionKey);
  runs.delete(runId);
}

export function getRun(runId: string): RunState | undefined {
  return runs.get(runId);
}

export function getRunBySession(sessionKey: string): string | undefined {
  return activeBySession.get(sessionKey);
}

function isTerminal(status: RunStatus): boolean {
  return status === "completed" || status === "aborted" || status === "failed";
}

export function pushEvent(runId: string, event: ProductEvent) {
  const state = runs.get(runId);
  if (!state) {
    return;
  }

  state.events.push(event);

  // Update status based on event type
  if (event.type === "run.started") {
    state.status = "running";
  } else if (event.type === "run.completed") {
    state.status = "completed";
    activeBySession.delete(state.sessionKey);
  } else if (event.type === "run.aborted") {
    state.status = "aborted";
    activeBySession.delete(state.sessionKey);
  } else if (event.type === "run.failed") {
    state.status = "failed";
    activeBySession.delete(state.sessionKey);
  }

  // Push to all SSE clients
  const sseData = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of state.sseClients) {
    res.write(sseData);
  }

  // On terminal state, send stream.end and close all SSE connections
  if (isTerminal(state.status)) {
    const endData = `data: ${JSON.stringify({ type: "stream.end" })}\n\n`;
    for (const res of state.sseClients) {
      res.write(endData);
      res.end();
    }
    state.sseClients.clear();
  }
}

export function addSseClient(runId: string, res: Response): boolean {
  const state = runs.get(runId);
  if (!state) {
    return false;
  }
  state.sseClients.add(res);
  return true;
}

export function removeSseClient(runId: string, res: Response) {
  const state = runs.get(runId);
  if (!state) {
    return;
  }
  state.sseClients.delete(res);
}

export function listRunsForConversation(conversationId: string): RunState[] {
  const result: RunState[] = [];
  for (const state of runs.values()) {
    if (state.conversationId === conversationId) {
      result.push(state);
    }
  }
  return result.toSorted((a, b) => a.createdAt - b.createdAt);
}
