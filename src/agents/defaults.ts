// Defaults for agent metadata when upstream does not supply them.
// Model id uses pi-ai's built-in Anthropic catalog.
// Can be overridden via WEBBOT_DEFAULT_MODEL="provider/model-id" env var.
function parseDefaultModelEnv(): { provider: string; model: string } {
  const raw = process.env.WEBBOT_DEFAULT_MODEL?.trim();
  if (raw) {
    const idx = raw.indexOf("/");
    if (idx !== -1) {
      return { provider: raw.slice(0, idx), model: raw.slice(idx + 1) };
    }
  }
  return { provider: "anthropic", model: "claude-opus-4-6" };
}
// Use `let` so that initDefaultModel() can re-assign after dotenv loads.
// ESM live bindings ensure all importers see the updated values.
export let DEFAULT_PROVIDER = "anthropic";
export let DEFAULT_MODEL = "claude-opus-4-6";

/** Re-read WEBBOT_DEFAULT_MODEL env var. Call after dotenv has loaded. */
export function initDefaultModel(): void {
  const parsed = parseDefaultModelEnv();
  DEFAULT_PROVIDER = parsed.provider;
  DEFAULT_MODEL = parsed.model;
}
// Conservative fallback used when model metadata is unavailable.
export const DEFAULT_CONTEXT_TOKENS = 200_000;
