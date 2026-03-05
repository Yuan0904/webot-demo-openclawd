/* istanbul ignore file */

/**
 * Stub for the deleted WhatsApp Web channel module.
 * These functions are no longer available.
 */

export function createWaSocket(..._args: unknown[]): never {
  throw new Error("WhatsApp Web channel has been removed.");
}

export function loginWeb(..._args: unknown[]): never {
  throw new Error("WhatsApp Web channel has been removed.");
}

export function logWebSelfId(..._args: unknown[]): void {
  // no-op
}

export async function monitorWebChannel(..._args: unknown[]): Promise<void> {
  throw new Error("WhatsApp Web channel has been removed.");
}

export async function monitorWebInbox(..._args: unknown[]): Promise<void> {
  throw new Error("WhatsApp Web channel has been removed.");
}

export function pickWebChannel(..._args: unknown[]): never {
  throw new Error("WhatsApp Web channel has been removed.");
}

export async function sendMessageWhatsApp(..._args: unknown[]): Promise<void> {
  throw new Error("WhatsApp Web channel has been removed.");
}

export const WA_WEB_AUTH_DIR = "";

export async function waitForWaConnection(..._args: unknown[]): Promise<void> {
  throw new Error("WhatsApp Web channel has been removed.");
}

export function webAuthExists(): boolean {
  return false;
}
