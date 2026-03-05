import { createHttpServer } from "./api/server.js";
import { mapGatewayEvent } from "./bridge/event-bridge.js";
import { loadConfig } from "./config.js";
import { GatewayClient } from "./gateway/client.js";
import { getRunBySession, pushEvent } from "./state/run-tracker.js";

const config = loadConfig();

console.log(
  `[sidecar] starting — gateway=${config.gatewayUrl} http=${config.httpHost}:${config.httpPort} agentId=${config.agentId}`,
);

const gateway = new GatewayClient({
  url: config.gatewayUrl,
  token: config.gatewayToken,
  onHelloOk: (hello) => {
    console.log(
      `[sidecar] gateway connected (protocol=${hello.protocol}, server=${hello.server.version}, tickInterval=${hello.policy.tickIntervalMs}ms)`,
    );
  },
  onConnectError: (err) => {
    console.error(`[sidecar] gateway connect error: ${err.message}`);
  },
  onClose: (code, reason) => {
    console.warn(`[sidecar] gateway closed (${code}): ${reason}`);
  },
  onGap: ({ expected, received }) => {
    console.warn(`[sidecar] frame seq gap: expected=${expected} received=${received}`);
  },
  onEvent: (evt) => {
    const resolveRunId = (sessionKey: string) => getRunBySession(sessionKey);
    const productEvents = mapGatewayEvent(evt, resolveRunId);
    for (const pe of productEvents) {
      console.log(`[sidecar] event: ${pe.type} runId=${pe.runId}`);
      pushEvent(pe.runId, pe);
    }
  },
});

gateway.start();

const app = createHttpServer(gateway);
app.listen(config.httpPort, config.httpHost, () => {
  console.log(`[sidecar] HTTP server listening on http://${config.httpHost}:${config.httpPort}`);
});
