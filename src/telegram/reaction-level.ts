/**
 * Stub for the deleted telegram/reaction-level module.
 */

import type { WebBotConfig } from "../config/config.js";

export function resolveTelegramReactionLevel(_params: {
  cfg?: WebBotConfig;
  accountId?: string;
}): { agentReactionGuidance?: "minimal" | "extensive" } {
  return {};
}
