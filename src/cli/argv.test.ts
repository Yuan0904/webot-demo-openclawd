import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "webbot", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "webbot", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "webbot", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "webbot", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "webbot", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "webbot", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "webbot", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "webbot"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "webbot", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "webbot", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "webbot", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "webbot", "status", "--timeout=2500"], "--timeout")).toBe(
      "2500",
    );
    expect(getFlagValue(["node", "webbot", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "webbot", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "webbot", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "webbot", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "webbot", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "webbot", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "webbot", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "webbot", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "webbot", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "webbot", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["node", "webbot", "status"],
    });
    expect(nodeArgv).toEqual(["node", "webbot", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["node-22", "webbot", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "webbot", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["node-22.2.0.exe", "webbot", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "webbot", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["node-22.2", "webbot", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "webbot", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["node-22.2.exe", "webbot", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "webbot", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["/usr/bin/node-22.2.0", "webbot", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "webbot", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["nodejs", "webbot", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "webbot", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["node-dev", "webbot", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "webbot", "node-dev", "webbot", "status"]);

    const directArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["webbot", "status"],
    });
    expect(directArgv).toEqual(["node", "webbot", "status"]);

    const bunArgv = buildParseArgv({
      programName: "webbot",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "webbot",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "webbot", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "webbot", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "webbot", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "webbot", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "webbot", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "webbot", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "webbot", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "webbot", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
