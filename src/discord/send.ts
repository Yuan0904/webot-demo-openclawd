/**
 * Stub for the deleted discord/send module.
 */

export async function sendMessageDiscord(..._args: unknown[]): Promise<void> {
  throw new Error("Discord channel has been removed.");
}

export type DiscordChannelPermissions = {
  channelId: string;
  guildId?: string;
  isDm?: boolean;
  channelType?: number;
  permissions: string[];
  raw?: string;
};

// oxlint-disable-next-line typescript/no-explicit-any
export async function fetchChannelPermissionsDiscord(
  channelId: string,
  _opts?: Record<string, unknown>,
): Promise<DiscordChannelPermissions> {
  return {
    channelId,
    permissions: [],
  };
}
