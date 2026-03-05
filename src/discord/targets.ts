/**
 * Stub for the deleted discord/targets module.
 */

// oxlint-disable-next-line typescript/no-explicit-any
export function parseDiscordTarget(input: string, _opts?: any): { id: string; kind: string; normalized: string } | null {
  if (!input) return null;
  return { id: input, kind: "channel", normalized: input };
}
