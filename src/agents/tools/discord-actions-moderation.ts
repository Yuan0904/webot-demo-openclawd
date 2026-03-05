/**
 * Stub for the deleted discord-actions-moderation module.
 */

import type { AgentToolResult } from "@mariozechner/pi-agent-core";

export async function handleDiscordModerationAction(
  action: string,
  _params: Record<string, unknown>,
  _isActionEnabled: (action: string) => boolean,
): Promise<AgentToolResult<unknown>> {
  return { content: [{ type: "text", text: `Discord moderation action "${action}" is not available (module removed).` }], details: {} };
}
