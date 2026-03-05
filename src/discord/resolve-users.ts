/**
 * Stub for the deleted discord/resolve-users module.
 */

export type DiscordUserResolveResult = {
  input: string;
  resolved: boolean;
  name?: string;
};

export async function resolveDiscordUserAllowlist(_params: {
  token: string;
  entries: string[];
}): Promise<DiscordUserResolveResult[]> {
  return [];
}
