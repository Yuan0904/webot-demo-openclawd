/**
 * Stub for the deleted slack/accounts module.
 */

import type { WebBotConfig } from "../config/config.js";

export type SlackAccountConfig = {
  userToken?: string;
  dm?: { allowFrom?: (string | number)[] };
  groupPolicy?: string;
  channels?: Record<string, { users?: (string | number)[] }>;
};

export type ResolvedSlackAccount = SlackAccountConfig & {
  botToken?: string;
  config: SlackAccountConfig;
};

export function resolveSlackAccount(_params: {
  cfg?: WebBotConfig;
  accountId?: string | null;
}): ResolvedSlackAccount {
  return { config: {} };
}

export function listSlackAccountIds(_cfg?: WebBotConfig): string[] {
  return [];
}

export function listEnabledSlackAccounts(_cfg?: WebBotConfig): string[] {
  return [];
}

export function resolveDefaultSlackAccountId(_cfg?: WebBotConfig): string | undefined {
  return undefined;
}

export function resolveSlackReplyToMode(_params: unknown): string {
  return "off";
}
