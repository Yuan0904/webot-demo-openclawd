/**
 * Stub for the deleted web/accounts module.
 */

import type { WebBotConfig } from "../config/config.js";

export type WhatsAppAccountConfig = {
  allowFrom?: (string | number)[];
  groupAllowFrom?: (string | number)[];
  dmPolicy?: string;
  groupPolicy?: string;
};

export type ResolvedWhatsAppAccount = WhatsAppAccountConfig;

export function resolveWhatsAppAccount(_params: {
  cfg?: WebBotConfig;
  accountId?: string | null;
}): WhatsAppAccountConfig {
  return {};
}

export function listWhatsAppAccountIds(_cfg?: WebBotConfig): string[] {
  return [];
}

export function resolveDefaultWhatsAppAccountId(_cfg?: WebBotConfig): string | undefined {
  return undefined;
}

export function hasAnyWhatsAppAuth(_cfg?: WebBotConfig): boolean {
  return false;
}
