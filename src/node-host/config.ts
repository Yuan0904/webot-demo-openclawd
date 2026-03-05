/**
 * Stub for the deleted node-host/config module.
 */

export type NodeHostConfig = {
  port?: number;
  host?: string;
  token?: string;
  gateway?: {
    url?: string;
    token?: string;
    host?: string;
    port?: number;
    tlsFingerprint?: string;
    tls?: boolean | Record<string, unknown>;
  };
};

export function loadNodeHostConfig(): NodeHostConfig {
  return {};
}
