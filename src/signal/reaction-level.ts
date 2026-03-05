/**
 * Stub for the deleted signal/reaction-level module.
 */

import type { WebBotConfig } from "../config/config.js";

export function resolveSignalReactionLevel(_params: {
  cfg?: WebBotConfig;
  accountId?: string;
}): { agentReactionGuidance?: "minimal" | "extensive" } {
  return {};
}
