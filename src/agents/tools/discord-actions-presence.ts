/**
 * Stub for the deleted discord-actions-presence module.
 */

import type { AgentToolResult } from "@mariozechner/pi-agent-core";

export async function handleDiscordPresenceAction(
  action: string,
  _params: Record<string, unknown>,
  _isActionEnabled: (action: string) => boolean,
): Promise<AgentToolResult<unknown>> {
  return { content: [{ type: "text", text: `Discord presence action "${action}" is not available (module removed).` }], details: {} };
}
