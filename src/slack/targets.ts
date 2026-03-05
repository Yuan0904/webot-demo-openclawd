/**
 * Stub for the deleted slack/targets module.
 */

export type ParsedSlackTarget = {
  kind: "channel" | "user";
  id: string;
};

export function parseSlackTarget(
  input: string,
  _opts?: { defaultKind?: string },
): ParsedSlackTarget | null {
  if (!input) return null;
  const cleaned = input.replace(/^slack:/i, "").trim();
  if (!cleaned) return null;
  const isUser = cleaned.startsWith("@") || cleaned.startsWith("U");
  return {
    kind: isUser ? "user" : "channel",
    id: cleaned.replace(/^[#@]/, ""),
  };
}
