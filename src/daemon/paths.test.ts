import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGatewayStateDir } from "./paths.js";

describe("resolveGatewayStateDir", () => {
  it("uses the default state dir when no overrides are set", () => {
    const env = { HOME: "/Users/test" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".webbot"));
  });

  it("appends the profile suffix when set", () => {
    const env = { HOME: "/Users/test", WEBBOT_PROFILE: "rescue" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".webbot-rescue"));
  });

  it("treats default profiles as the base state dir", () => {
    const env = { HOME: "/Users/test", WEBBOT_PROFILE: "Default" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".webbot"));
  });

  it("uses WEBBOT_STATE_DIR when provided", () => {
    const env = { HOME: "/Users/test", WEBBOT_STATE_DIR: "/var/lib/webbot" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/var/lib/webbot"));
  });

  it("expands ~ in WEBBOT_STATE_DIR", () => {
    const env = { HOME: "/Users/test", WEBBOT_STATE_DIR: "~/webbot-state" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/Users/test/webbot-state"));
  });

  it("preserves Windows absolute paths without HOME", () => {
    const env = { WEBBOT_STATE_DIR: "C:\\State\\webbot" };
    expect(resolveGatewayStateDir(env)).toBe("C:\\State\\webbot");
  });
});
