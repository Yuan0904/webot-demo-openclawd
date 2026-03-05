import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveStorePath } from "./paths.js";

describe("resolveStorePath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses WEBBOT_HOME for tilde expansion", () => {
    vi.stubEnv("WEBBOT_HOME", "/srv/webbot-home");
    vi.stubEnv("HOME", "/home/other");

    const resolved = resolveStorePath("~/.webbot/agents/{agentId}/sessions/sessions.json", {
      agentId: "research",
    });

    expect(resolved).toBe(
      path.resolve("/srv/webbot-home/.webbot/agents/research/sessions/sessions.json"),
    );
  });
});
