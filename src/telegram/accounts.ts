/**
 * Stub for the deleted telegram/accounts module.
 */

import type { WebBotConfig } from "../config/config.js";

export type TelegramAccountConfig = {
  allowFrom?: (string | number)[];
  groupAllowFrom?: (string | number)[];
  dmPolicy?: string;
  groupPolicy?: string;
  groups?: Record<string, {
    allowFrom?: (string | number)[];
    topics?: Record<string, { allowFrom?: (string | number)[] }>;
  }>;
};

export type ResolvedTelegramAccount = {
  config: TelegramAccountConfig;
  botToken?: string;
};

export function resolveTelegramAccount(_params: {
  cfg?: WebBotConfig;
  accountId?: string | null;
}): ResolvedTelegramAccount {
  return { config: {} };
}

export function listTelegramAccountIds(_cfg?: WebBotConfig): string[] {
  return [];
}

export function resolveDefaultTelegramAccountId(_cfg?: WebBotConfig): string | undefined {
  return undefined;
}
