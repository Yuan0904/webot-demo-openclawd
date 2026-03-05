/**
 * Stub module for wizard/session.
 *
 * Provides the minimal `WizardSession` type and factory so that
 * `import type { WizardSession } from "../../wizard/session.js"` compiles.
 */

export type WizardSession = {
  id: string;
  status: string;
};

export function createWizardSession(): WizardSession {
  return { id: "", status: "idle" };
}
