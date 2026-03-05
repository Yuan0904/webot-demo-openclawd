/**
 * Stub for the deleted onboarding-types module.
 */

import type { ChannelId } from "./types.js";
import type { WebBotConfig } from "../../config/config.js";
import type { WizardPrompter } from "../../wizard/prompts.js";
import type { RuntimeEnv } from "../../runtime.js";

export type ChannelOnboardingDmPolicy = {
  channel: ChannelId;
  policyKey: string;
  allowFromKey: string;
  label: string;
  getCurrent: (cfg: WebBotConfig) => string | undefined;
  setPolicy: (cfg: WebBotConfig, policy: string) => WebBotConfig;
  promptAllowFrom?: (params: {
    cfg: WebBotConfig;
    prompter: WizardPrompter;
    accountId?: string;
  }) => Promise<WebBotConfig>;
};

export type ChannelOnboardingStatus = {
  channel: ChannelId;
  isConfigured?: boolean;
  configured?: boolean;
  hasAuth?: boolean;
  accountIds?: string[];
  defaultAccountId?: string;
  summary?: string;
  statusLines?: string[];
  selectionHint?: string;
  quickstartScore?: number;
};

// oxlint-disable-next-line typescript/no-explicit-any
export type SetupChannelsOptions = {
  cfg?: WebBotConfig;
  prompter?: WizardPrompter;
  runtime?: RuntimeEnv;
  workspaceDir?: string;
  agentDir?: string;
  channelId?: string;
  allowDisable?: boolean;
  allowSignalInstall?: boolean;
  forceAllowFromChannels?: string[];
  accountIds?: Record<string, string>;
  whatsappAccountId?: string;
  skipStatusNote?: boolean;
  skipConfirm?: boolean;
  initialSelection?: string[];
  promptAccountIds?: boolean;
  onAccountId?: (channel: string, accountId: string) => void;
  onSelection?: (channels: string[]) => void;
  skipDmPolicyPrompt?: boolean;
  quickstartDefaults?: boolean;
  [key: string]: unknown;
};

export type ChannelOnboardingAdapter = {
  channelId: string;
  label: string;
  dmPolicy?: ChannelOnboardingDmPolicy;
  /** Check if the channel is already configured */
  status?: (cfg: WebBotConfig) => ChannelOnboardingStatus;
  /** Check status with full params */
  // oxlint-disable-next-line typescript/no-explicit-any
  getStatus?: (params: any) => Promise<ChannelOnboardingStatus>;
  /** Run interactive setup */
  setup?: (opts: SetupChannelsOptions) => Promise<Partial<WebBotConfig> | undefined>;
  /** Run full configure flow */
  // oxlint-disable-next-line typescript/no-explicit-any
  configure?: (params: any) => Promise<{ cfg: WebBotConfig; accountId?: string }>;
  /** Disable the channel */
  disable?: (cfg: WebBotConfig) => WebBotConfig;
  /** Called when an account ID is recorded */
  // oxlint-disable-next-line typescript/no-explicit-any
  onAccountRecorded?: (accountId: string, options?: any) => void;
};
