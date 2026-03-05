/**
 * Stub module for wizard/onboarding.
 *
 * The interactive onboarding wizard was removed. This export satisfies
 * `import { runOnboardingWizard } from "../wizard/onboarding.js"`.
 */

import type { WizardPrompter } from "./prompts.js";

// oxlint-disable-next-line typescript/no-explicit-any
export async function runOnboardingWizard(
  _opts: any,
  _runtime: any,
  _prompter?: WizardPrompter,
): Promise<void> {
  // no-op
}
