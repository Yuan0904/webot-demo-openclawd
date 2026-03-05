// Gateway protocol frame types (simplified from src/gateway/protocol/)

export type RequestFrame = {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
};

export type ResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { message?: string; code?: string };
};

export type EventFrame = {
  type: "event";
  seq?: number;
  event: string;
  payload?: unknown;
  stateVersion?: number;
};

export type HelloOk = {
  type: "hello-ok";
  protocol: number;
  server: {
    version: string;
    commit?: string;
    host?: string;
    connId: string;
  };
  features: {
    methods: string[];
    events: string[];
  };
  snapshot?: unknown;
  canvasHostUrl?: string;
  auth?: {
    deviceToken?: string;
    role?: string;
    scopes?: string[];
    issuedAtMs?: number;
  };
  policy: {
    maxPayload: number;
    maxBufferedBytes: number;
    tickIntervalMs: number;
  };
};

export type ConnectParams = {
  minProtocol: number;
  maxProtocol: number;
  client: {
    id: string;
    displayName?: string;
    version: string;
    platform: string;
    mode: string;
    instanceId?: string;
  };
  caps: string[];
  auth?: {
    token?: string;
    password?: string;
  };
  role: string;
  scopes: string[];
};

export function isEventFrame(data: unknown): data is EventFrame {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).type === "event" &&
    typeof (data as Record<string, unknown>).event === "string"
  );
}

export function isResponseFrame(data: unknown): data is ResponseFrame {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).type === "res" &&
    typeof (data as Record<string, unknown>).id === "string"
  );
}
