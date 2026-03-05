/**
 * Stub for the deleted pairing/pairing-store module.
 */

export type PairingChannel = string;

export type PairingRequest = {
  code: string;
  id: string;
  meta?: unknown;
  createdAt: string;
};

export async function readChannelAllowFromStore(
  _channel: string,
): Promise<string[]> {
  return [];
}

export async function addChannelAllowFromStoreEntry(_params: {
  channel: string;
  entry: string;
}): Promise<void> {
  // no-op
}

export async function removeChannelAllowFromStoreEntry(_params: {
  channel: string;
  entry: string;
}): Promise<void> {
  // no-op
}

export async function listChannelPairingRequests(
  _channel: PairingChannel,
): Promise<PairingRequest[]> {
  return [];
}

export async function approveChannelPairingCode(_params: {
  channel: PairingChannel;
  code: string;
}): Promise<{ id: string } | null> {
  return null;
}
