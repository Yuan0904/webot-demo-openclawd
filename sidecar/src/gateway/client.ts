import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import type { ConnectParams, EventFrame, HelloOk, RequestFrame, ResponseFrame } from "./types.js";
import { isEventFrame, isResponseFrame } from "./types.js";

const PROTOCOL_VERSION = 3;

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
  expectFinal: boolean;
};

export type GatewayClientOptions = {
  url: string;
  token?: string;
  onEvent?: (evt: EventFrame) => void;
  onHelloOk?: (hello: HelloOk) => void;
  onConnectError?: (err: Error) => void;
  onClose?: (code: number, reason: string) => void;
  onGap?: (info: { expected: number; received: number }) => void;
};

export class GatewayClient {
  private ws: WebSocket | null = null;
  private opts: GatewayClientOptions;
  private pending = new Map<string, Pending>();
  private backoffMs = 1000;
  private closed = false;
  private lastSeq: number | null = null;
  private connectNonce: string | null = null;
  private connectSent = false;
  private connectTimer: NodeJS.Timeout | null = null;
  private lastTick: number | null = null;
  private tickIntervalMs = 30_000;
  private tickTimer: NodeJS.Timeout | null = null;
  private _policy: HelloOk["policy"] | null = null;

  get policy() {
    return this._policy;
  }

  constructor(opts: GatewayClientOptions) {
    this.opts = opts;
  }

  start() {
    if (this.closed) {
      return;
    }
    const url = this.opts.url;
    this.ws = new WebSocket(url, { maxPayload: 25 * 1024 * 1024 });

    this.ws.on("open", () => {
      this.queueConnect();
    });
    this.ws.on("message", (data) => {
      const raw = typeof data === "string" ? data : data.toString("utf-8");
      this.handleMessage(raw);
    });
    this.ws.on("close", (code, reason) => {
      const reasonText = typeof reason === "string" ? reason : reason.toString("utf-8");
      this.ws = null;
      this.flushPendingErrors(new Error(`gateway closed (${code}): ${reasonText}`));
      this.scheduleReconnect();
      this.opts.onClose?.(code, reasonText);
    });
    this.ws.on("error", (err) => {
      if (!this.connectSent) {
        this.opts.onConnectError?.(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  stop() {
    this.closed = true;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.flushPendingErrors(new Error("gateway client stopped"));
  }

  private sendConnect() {
    if (this.connectSent) {
      return;
    }
    this.connectSent = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    const auth = this.opts.token
      ? { token: this.opts.token, password: this.opts.token }
      : undefined;
    const params: ConnectParams = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: "gateway-client",
        displayName: "Sidecar Backend",
        version: "0.1.0",
        platform: process.platform,
        mode: "backend",
      },
      caps: ["tool-events"],
      auth,
      role: "operator",
      scopes: ["operator.write", "operator.read", "operator.admin"],
    };

    void this.request<HelloOk>("connect", params)
      .then((helloOk) => {
        this.backoffMs = 1000;
        this._policy = helloOk.policy;
        this.tickIntervalMs = helloOk.policy.tickIntervalMs;
        this.lastTick = Date.now();
        this.startTickWatch();
        this.opts.onHelloOk?.(helloOk);
      })
      .catch((err) => {
        this.opts.onConnectError?.(err instanceof Error ? err : new Error(String(err)));
        this.ws?.close(1008, "connect failed");
      });
  }

  private handleMessage(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      if (isEventFrame(parsed)) {
        if (parsed.event === "connect.challenge") {
          const payload = parsed.payload as { nonce?: unknown } | undefined;
          const nonce = payload && typeof payload.nonce === "string" ? payload.nonce : null;
          if (nonce) {
            this.connectNonce = nonce;
            this.sendConnect();
          }
          return;
        }
        const seq = typeof parsed.seq === "number" ? parsed.seq : null;
        if (seq !== null) {
          if (this.lastSeq !== null && seq > this.lastSeq + 1) {
            this.opts.onGap?.({ expected: this.lastSeq + 1, received: seq });
          }
          this.lastSeq = seq;
        }
        if (parsed.event === "tick") {
          this.lastTick = Date.now();
        }
        this.opts.onEvent?.(parsed);
        return;
      }
      if (isResponseFrame(parsed)) {
        const pending = this.pending.get(parsed.id);
        if (!pending) {
          return;
        }
        const payload = parsed.payload as { status?: unknown } | undefined;
        const status = payload?.status;
        if (pending.expectFinal && status === "accepted") {
          return;
        }
        this.pending.delete(parsed.id);
        if (parsed.ok) {
          pending.resolve(parsed.payload);
        } else {
          pending.reject(new Error(parsed.error?.message ?? "unknown error"));
        }
      }
    } catch {
      // parse error, ignore
    }
  }

  private queueConnect() {
    this.connectNonce = null;
    this.connectSent = false;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
    }
    this.connectTimer = setTimeout(() => this.sendConnect(), 750);
  }

  private scheduleReconnect() {
    if (this.closed) {
      return;
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
    setTimeout(() => this.start(), delay).unref();
  }

  private flushPendingErrors(err: Error) {
    for (const [, p] of this.pending) {
      p.reject(err);
    }
    this.pending.clear();
  }

  private startTickWatch() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }
    const interval = Math.max(this.tickIntervalMs, 1000);
    this.tickTimer = setInterval(() => {
      if (this.closed || !this.lastTick) {
        return;
      }
      const gap = Date.now() - this.lastTick;
      if (gap > this.tickIntervalMs * 2) {
        this.ws?.close(4000, "tick timeout");
      }
    }, interval);
  }

  async request<T = Record<string, unknown>>(
    method: string,
    params?: unknown,
    opts?: { expectFinal?: boolean },
  ): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("gateway not connected");
    }
    const id = randomUUID();
    const frame: RequestFrame = { type: "req", id, method, params };
    const expectFinal = opts?.expectFinal === true;
    const p = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        expectFinal,
      });
    });
    this.ws.send(JSON.stringify(frame));
    return p;
  }
}
