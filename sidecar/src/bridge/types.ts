// Product-facing event types emitted via SSE

export type ProductEvent =
  | { type: "run.started"; runId: string; conversationId: string; timestamp: number; seq?: number }
  | { type: "run.completed"; runId: string; timestamp: number; seq?: number }
  | { type: "run.aborted"; runId: string; timestamp: number; seq?: number }
  | { type: "run.failed"; runId: string; error: string; timestamp: number; seq?: number }
  | { type: "assistant.delta"; runId: string; delta: string; timestamp: number; seq?: number }
  | {
      type: "tool.started";
      runId: string;
      toolName: string;
      toolCallId?: string;
      timestamp: number;
      seq?: number;
    }
  | {
      type: "tool.updated";
      runId: string;
      toolCallId?: string;
      data?: unknown;
      timestamp: number;
      seq?: number;
    }
  | {
      type: "tool.result";
      runId: string;
      toolCallId?: string;
      result?: unknown;
      timestamp: number;
      seq?: number;
    };
