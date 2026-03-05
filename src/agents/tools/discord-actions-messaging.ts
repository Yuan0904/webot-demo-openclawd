/**
 * Stub for the deleted discord-actions-messaging module.
 */

import type { AgentToolResult } from "@mariozechner/pi-agent-core";

export async function handleDiscordMessagingAction(
  action: string,
  _params: Record<string, unknown>,
  _isActionEnabled: (action: string) => boolean,
): Promise<AgentToolResult<unknown>> {
  return { content: [{ type: "text", text: `Discord messaging action "${action}" is not available (module removed).` }], details: {} };
}
