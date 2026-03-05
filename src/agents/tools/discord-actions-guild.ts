/**
 * Stub for the deleted discord-actions-guild module.
 */

import type { AgentToolResult } from "@mariozechner/pi-agent-core";

export async function handleDiscordGuildAction(
  action: string,
  _params: Record<string, unknown>,
  _isActionEnabled: (action: string) => boolean,
): Promise<AgentToolResult<unknown>> {
  return { content: [{ type: "text", text: `Discord guild action "${action}" is not available (module removed).` }], details: {} };
}
