/**
 * Stub for the deleted imessage/accounts module.
 */

import type { WebBotConfig } from "../config/config.js";

export type IMessageAccountConfig = {
  allowFrom?: (string | number)[];
  groupAllowFrom?: (string | number)[];
  dmPolicy?: string;
  groupPolicy?: string;
};

export type ResolvedIMessageAccount = {
  config: IMessageAccountConfig;
};

export function resolveIMessageAccount(_params: {
  cfg?: WebBotConfig;
  accountId?: string | null;
}): ResolvedIMessageAccount {
  return { config: {} };
}

export function listIMessageAccountIds(_cfg?: WebBotConfig): string[] {
  return [];
}

export function resolveDefaultIMessageAccountId(_cfg?: WebBotConfig): string | undefined {
  return undefined;
}
