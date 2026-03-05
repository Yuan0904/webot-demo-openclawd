/**
 * Stub for the deleted slack/resolve-users module.
 */

export type SlackUserResolveResult = {
  input: string;
  resolved: boolean;
  name?: string;
};

export async function resolveSlackUserAllowlist(_params: {
  token: string;
  entries: string[];
}): Promise<SlackUserResolveResult[]> {
  return [];
}
