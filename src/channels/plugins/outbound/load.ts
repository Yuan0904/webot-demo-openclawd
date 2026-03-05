/**
 * Stub for the deleted outbound/load module.
 */

import type { ChannelOutboundAdapter } from "../types.adapters.js";

export async function loadChannelOutboundAdapter(
  _channel: string,
): Promise<ChannelOutboundAdapter | null> {
  return null;
}
