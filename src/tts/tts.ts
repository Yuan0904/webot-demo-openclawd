/**
 * Stub for the deleted tts/tts module.
 * Provides no-op implementations of the TTS functions.
 */

import type { WebBotConfig } from "../config/config.js";

export type TtsConfig = {
  mode?: string;
  provider?: string;
  voice?: string;
  enabled?: boolean;
};

export function buildTtsSystemPromptHint(_cfg?: WebBotConfig): string | undefined {
  return undefined;
}

export function resolveTtsConfig(_cfg?: WebBotConfig): TtsConfig {
  return { mode: "off", enabled: false };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveTtsPrefsPath(..._args: any[]): string | undefined {
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveTtsAutoMode(..._args: any[]): string | undefined {
  return undefined;
}

export function normalizeTtsAutoMode(_value?: string | null): string | undefined {
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTtsMaxLength(..._args: any[]): number {
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTtsProvider(..._args: any[]): string | undefined {
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSummarizationEnabled(..._args: any[]): boolean {
  return false;
}

export async function maybeApplyTtsToPayload(params: {
  payload: { text?: string; mediaUrl?: string; audioAsVoice?: boolean; [key: string]: unknown };
  cfg?: WebBotConfig;
  channel?: string;
  kind?: string;
  inboundAudio?: boolean;
  ttsAuto?: string;
}): Promise<{ text?: string; mediaUrl?: string; audioAsVoice?: boolean; [key: string]: unknown }> {
  return params.payload;
}
