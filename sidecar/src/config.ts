export type SidecarConfig = {
  /** Gateway WebSocket URL. Default: ws://127.0.0.1:18789 */
  gatewayUrl: string;
  /** Gateway auth token. */
  gatewayToken?: string;
  /** HTTP server port. Default: 3100 */
  httpPort: number;
  /** HTTP server bind host. Default: 127.0.0.1 */
  httpHost: string;
  /** Agent ID used in sessionKey. Default: main */
  agentId: string;
};

let _config: SidecarConfig | null = null;

export function loadConfig(): SidecarConfig {
  _config = {
    gatewayUrl: process.env.GATEWAY_URL ?? "ws://127.0.0.1:18789",
    gatewayToken: process.env.GATEWAY_TOKEN,
    httpPort: Number(process.env.HTTP_PORT) || 3100,
    httpHost: process.env.HTTP_HOST ?? "127.0.0.1",
    agentId: process.env.AGENT_ID ?? "main",
  };
  return _config;
}

export function getConfig(): SidecarConfig {
  if (!_config) {
    return loadConfig();
  }
  return _config;
}
