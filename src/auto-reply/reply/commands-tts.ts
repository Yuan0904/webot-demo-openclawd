/**
 * Stub for the deleted commands-tts module.
 * TTS commands are no longer available.
 */

import type { CommandHandler } from "./commands-types.js";

export const handleTtsCommands: CommandHandler = async (_params, _allowText) => {
  return null;
};
