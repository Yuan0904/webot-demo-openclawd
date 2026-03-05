/**
 * Stub for the deleted line-directives module.
 * LINE-specific reply directives are no longer available.
 */

import type { ReplyPayload } from "../types.js";

export function hasLineDirectives(_text: string): boolean {
  return false;
}

export type LineDirectiveResult = {
  text: string;
  directives?: unknown[];
};

export function parseLineDirectives(payload: ReplyPayload): ReplyPayload {
  return payload;
}
