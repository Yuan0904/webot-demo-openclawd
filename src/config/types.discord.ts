/**
 * Stub for the deleted Discord config types.
 */

import type { ProviderCommandsConfig } from "./types.messages.js";

export type DiscordActionConfig = {
  [key: string]: boolean | undefined;
};

export type DiscordConfig = {
  actions?: DiscordActionConfig;
  commands?: ProviderCommandsConfig;
  [key: string]: unknown;
};
