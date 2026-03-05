import { getConfig } from "../config.js";

/** Maps conversationId → gateway sessionKey */
const sessions = new Map<string, string>();
/** Tracks sessions that have had verboseLevel configured */
const configuredSessions = new Set<string>();

export function getOrCreateSessionKey(conversationId: string): string {
  const existing = sessions.get(conversationId);
  if (existing) {
    return existing;
  }
  const agentId = getConfig().agentId;
  const key = `agent:${agentId}:app:${conversationId}`;
  sessions.set(conversationId, key);
  return key;
}

export function isSessionConfigured(sessionKey: string): boolean {
  return configuredSessions.has(sessionKey);
}

export function markSessionConfigured(sessionKey: string): void {
  configuredSessions.add(sessionKey);
}

export function getSessionKey(conversationId: string): string | undefined {
  return sessions.get(conversationId);
}

export function findConversationBySessionKey(sessionKey: string): string | undefined {
  for (const [convId, key] of sessions) {
    if (key === sessionKey) {
      return convId;
    }
  }
  return undefined;
}
