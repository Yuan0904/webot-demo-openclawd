/**
 * Stub for the deleted telegram/targets module.
 */

export type ParsedTelegramTarget = {
  chatId: string;
  topicId?: string;
};

export function parseTelegramTarget(input: string): ParsedTelegramTarget {
  // Strip "telegram:" prefix variants
  const cleaned = input.replace(/^telegram:(group:|dm:|channel:)?/i, "").trim();
  const parts = cleaned.split(":topic:");
  return {
    chatId: parts[0] ?? cleaned,
    topicId: parts[1],
  };
}
