import type { OutboundSendDeps } from "../infra/outbound/deliver.js";
import { logWebSelfId } from "../channels/web/index.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type CliDeps = {};

export function createDefaultDeps(): CliDeps {
  return {};
}

// Provider docking: channel sends are now handled via the plugin system.
export function createOutboundSendDeps(_deps: CliDeps): OutboundSendDeps {
  return {};
}

export { logWebSelfId };
