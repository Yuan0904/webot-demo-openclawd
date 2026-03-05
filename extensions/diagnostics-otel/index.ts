import type { WebBotPluginApi } from "webbot/plugin-sdk";
import { emptyPluginConfigSchema } from "webbot/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: WebBotPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
