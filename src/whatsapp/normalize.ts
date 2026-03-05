/**
 * Stub for the deleted whatsapp/normalize module.
 */

export function isWhatsAppGroupJid(jid: string): boolean {
  return jid.includes("@g.us");
}

export function normalizeWhatsAppTarget(input: string): string {
  return input.trim();
}
