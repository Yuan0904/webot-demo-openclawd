/**
 * Stub for the deleted directory-config module.
 */

import type { WebBotConfig } from "../../config/config.js";

export type DirectoryConfigParams = {
  cfg: WebBotConfig;
  accountId?: string;
};

export type DirectoryEntry = {
  id: string;
  name?: string;
  label?: string;
};

export function listDiscordDirectoryGroupsFromConfig(_params: DirectoryConfigParams): DirectoryEntry[] {
  return [];
}
export function listDiscordDirectoryPeersFromConfig(_params: DirectoryConfigParams): DirectoryEntry[] {
  return [];
}
export function listSlackDirectoryGroupsFromConfig(_params: DirectoryConfigParams): DirectoryEntry[] {
  return [];
}
export function listSlackDirectoryPeersFromConfig(_params: DirectoryConfigParams): DirectoryEntry[] {
  return [];
}
export function listTelegramDirectoryGroupsFromConfig(_params: DirectoryConfigParams): DirectoryEntry[] {
  return [];
}
export function listTelegramDirectoryPeersFromConfig(_params: DirectoryConfigParams): DirectoryEntry[] {
  return [];
}
export function listWhatsAppDirectoryGroupsFromConfig(_params: DirectoryConfigParams): DirectoryEntry[] {
  return [];
}
export function listWhatsAppDirectoryPeersFromConfig(_params: DirectoryConfigParams): DirectoryEntry[] {
  return [];
}
