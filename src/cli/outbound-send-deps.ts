import type { OutboundSendDeps } from "../infra/outbound/deliver.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type CliDeps = {};

// Provider docking: channel sends are now handled via the plugin system.
export function createOutboundSendDeps(_deps: CliDeps): OutboundSendDeps {
  return {};
}
