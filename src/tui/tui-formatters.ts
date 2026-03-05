/**
 * Stub for the deleted tui/tui-formatters module.
 */

export function extractTextFromMessage(_message: unknown): string {
  if (!_message || typeof _message !== "object") return "";
  const msg = _message as Record<string, unknown>;
  if (typeof msg.text === "string") return msg.text;
  if (typeof msg.content === "string") return msg.content;
  return "";
}
