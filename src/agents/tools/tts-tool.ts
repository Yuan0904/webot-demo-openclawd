/**
 * Stub for the deleted TTS tool.
 * Returns a no-op tool definition.
 */

import type { AnyAgentTool } from "./common.js";
import type { WebBotConfig } from "../../config/config.js";
import type { GatewayMessageChannel } from "../../utils/message-channel.js";

export function createTtsTool(_options?: {
  agentChannel?: GatewayMessageChannel;
  config?: WebBotConfig;
}): AnyAgentTool {
  return {
    name: "tts",
    description: "Text-to-speech (disabled - TTS module removed)",
    parameters: {},
    execute: async () => ({ result: "TTS is not available in this build." }),
  } as unknown as AnyAgentTool;
}
