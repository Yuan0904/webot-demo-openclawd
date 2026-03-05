/**
 * Stub for the deleted line/types module.
 */

export type LineConfig = {
  accounts?: Record<string, LineAccountConfig>;
};

export type LineAccountConfig = {
  channelAccessToken?: string;
  channelSecret?: string;
  [key: string]: unknown;
};

export type ResolvedLineAccount = {
  channelAccessToken: string;
  channelSecret: string;
  [key: string]: unknown;
};

export type LineChannelData = {
  channelId?: string;
  channelName?: string;
};
