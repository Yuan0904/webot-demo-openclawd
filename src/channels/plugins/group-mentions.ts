/**
 * Stub for the deleted group-mentions module.
 */

import type { WebBotConfig } from "../../config/config.js";

type ResolveParams = { cfg?: WebBotConfig; accountId?: string | null };

export function resolveBlueBubblesGroupRequireMention(_params: ResolveParams): boolean { return false; }
export function resolveDiscordGroupRequireMention(_params: ResolveParams): boolean { return false; }
export function resolveGoogleChatGroupRequireMention(_params: ResolveParams): boolean { return false; }
export function resolveIMessageGroupRequireMention(_params: ResolveParams): boolean { return false; }
export function resolveSlackGroupRequireMention(_params: ResolveParams): boolean { return false; }
export function resolveTelegramGroupRequireMention(_params: ResolveParams): boolean { return false; }
export function resolveWhatsAppGroupRequireMention(_params: ResolveParams): boolean { return false; }

export function resolveBlueBubblesGroupToolPolicy(_params: ResolveParams): string { return "default"; }
export function resolveDiscordGroupToolPolicy(_params: ResolveParams): string { return "default"; }
export function resolveGoogleChatGroupToolPolicy(_params: ResolveParams): string { return "default"; }
export function resolveIMessageGroupToolPolicy(_params: ResolveParams): string { return "default"; }
export function resolveSlackGroupToolPolicy(_params: ResolveParams): string { return "default"; }
export function resolveTelegramGroupToolPolicy(_params: ResolveParams): string { return "default"; }
export function resolveWhatsAppGroupToolPolicy(_params: ResolveParams): string { return "default"; }
