/**
 * Stub for the deleted telegram/inline-buttons module.
 */

import type { WebBotConfig } from "../config/config.js";

export function resolveTelegramInlineButtonsScope(_params: {
  cfg?: WebBotConfig;
  accountId?: string;
}): string {
  return "off";
}
