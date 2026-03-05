/**
 * Stub for the deleted signal/accounts module.
 */

import type { WebBotConfig } from "../config/config.js";

export type SignalAccountConfig = {
  allowFrom?: (string | number)[];
  groupAllowFrom?: (string | number)[];
  dmPolicy?: string;
  groupPolicy?: string;
};

export type ResolvedSignalAccount = {
  config: SignalAccountConfig;
};

export function resolveSignalAccount(_params: {
  cfg?: WebBotConfig;
  accountId?: string | null;
}): ResolvedSignalAccount {
  return { config: {} };
}

export function listSignalAccountIds(_cfg?: WebBotConfig): string[] {
  return [];
}

export function resolveDefaultSignalAccountId(_cfg?: WebBotConfig): string | undefined {
  return undefined;
}
