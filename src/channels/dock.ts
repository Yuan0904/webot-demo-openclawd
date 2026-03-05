/**
 * Stub module for channels/dock.
 *
 * All concrete channel implementations have been removed. This file provides
 * the `ChannelDock` type and the two runtime helpers (`getChannelDock` and
 * `listChannelDocks`) so that existing import sites continue to compile.
 *
 * Because no channels are registered, `getChannelDock` always returns
 * `undefined` and `listChannelDocks` always returns an empty array.
 */

import type { ChannelId } from "./plugins/types.js";
import type { WebBotConfig } from "../config/config.js";
import type { BlockStreamingCoalesceConfig } from "../config/types.js";
import type { MsgContext } from "../auto-reply/templating.js";

// ---------------------------------------------------------------------------
// ChannelDock type
// ---------------------------------------------------------------------------

export type ChannelDock = {
  id: ChannelId;

  config?: {
    resolveAllowFrom?: (params: {
      cfg: WebBotConfig;
      accountId?: string | null;
    }) => Array<string | number>;
    formatAllowFrom?: (params: {
      cfg: WebBotConfig;
      accountId?: string | null;
      allowFrom: Array<string | number>;
    }) => string[];
  };

  commands?: {
    enforceOwnerForCommands?: boolean;
    skipWhenConfigEmpty?: boolean;
  };

  threading?: {
    // oxlint-disable-next-line typescript/no-explicit-any
    buildToolContext?: (params: any) => any;
    resolveReplyToMode?: (params: {
      cfg: WebBotConfig;
      accountId?: string | null;
      chatType?: string | null;
    }) => string | undefined;
    allowTagsWhenOff?: boolean;
  };

  groups?: {
    // oxlint-disable-next-line typescript/no-explicit-any
    resolveRequireMention?: (params: any) => boolean;
    // oxlint-disable-next-line typescript/no-explicit-any
    resolveGroupIntroHint?: (params: any) => string | undefined;
    // oxlint-disable-next-line typescript/no-explicit-any
    resolveToolPolicy?: (params: any) => unknown;
  };

  agentPrompt?: {
    // oxlint-disable-next-line typescript/no-explicit-any
    messageToolHints?: (params: any) => string[];
  };

  mentions?: {
    stripPatterns?: (params: {
      ctx: MsgContext;
      cfg: WebBotConfig | undefined;
      agentId?: string;
    }) => string[];
    stripMentions?: (params: {
      text: string;
      ctx: MsgContext;
      cfg: WebBotConfig | undefined;
      agentId?: string;
    }) => string;
  };

  elevated?: {
    allowFromFallback?: (params: {
      cfg: WebBotConfig;
      accountId?: string | null;
    }) => Array<string | number> | undefined;
  };

  outbound?: {
    textChunkLimit?: number;
  };

  streaming?: {
    blockStreamingCoalesceDefaults?: BlockStreamingCoalesceConfig;
  };

  capabilities: {
    chatTypes: string[];
    nativeCommands?: boolean;
  };
};

// ---------------------------------------------------------------------------
// Runtime helpers (no-op since no channels are registered)
// ---------------------------------------------------------------------------

export function getChannelDock(_id: ChannelId): ChannelDock | undefined {
  return undefined;
}

export function listChannelDocks(): ChannelDock[] {
  return [];
}
