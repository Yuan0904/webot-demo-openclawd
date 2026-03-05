/**
 * Stub for the deleted slack/scopes module.
 */

export type SlackScopesResult = {
  ok: boolean;
  scopes?: string[];
  error?: string;
  source?: string;
};

export async function fetchSlackScopes(..._args: unknown[]): Promise<SlackScopesResult> {
  return { ok: false };
}
