/**
 * Stub for the deleted line/accounts module.
 */

import type { WebBotConfig } from "../config/config.js";
import type { ResolvedLineAccount } from "./types.js";

export function listLineAccountIds(_cfg?: WebBotConfig): string[] { return []; }
export function normalizeAccountId(_id?: string): string { return _id ?? ""; }
export function resolveDefaultLineAccountId(_cfg?: WebBotConfig): string | undefined { return undefined; }
export function resolveLineAccount(_params: unknown): ResolvedLineAccount {
  return { channelAccessToken: "", channelSecret: "" };
}
