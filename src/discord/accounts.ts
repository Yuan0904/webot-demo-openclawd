/**
 * Stub for the deleted discord/accounts module.
 */

import type { WebBotConfig } from "../config/config.js";

export type DiscordAccountConfig = {
  dm?: { allowFrom?: (string | number)[] };
  groupPolicy?: string;
  guilds?: Record<string, {
    users?: (string | number)[];
    channels?: Record<string, { users?: (string | number)[] }>;
  }>;
};

export type ResolvedDiscordAccount = {
  token?: string;
  config: DiscordAccountConfig;
};

export function resolveDiscordAccount(_params: {
  cfg?: WebBotConfig;
  accountId?: string | null;
}): ResolvedDiscordAccount {
  return { config: {} };
}

export function listDiscordAccountIds(_cfg?: WebBotConfig): string[] {
  return [];
}

export function resolveDefaultDiscordAccountId(_cfg?: WebBotConfig): string | undefined {
  return undefined;
}

export type DiscordAccountInfo = ResolvedDiscordAccount;
