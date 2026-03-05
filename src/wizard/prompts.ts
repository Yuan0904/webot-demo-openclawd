/**
 * Stub module for wizard/prompts.
 *
 * The original wizard UI was removed. This file provides minimal type and value
 * exports so that existing import sites continue to compile.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WizardSelectOption<T = string> = {
  value: T;
  label: string;
  hint?: string;
};

export type WizardPrompter = {
  intro: (title?: string) => Promise<void> | void;
  outro: (message?: string) => Promise<void> | void;
  text: (opts: { message: string; initialValue?: string; placeholder?: string; validate?: (value: string) => string | void | undefined }) => Promise<string>;
  confirm: (opts: { message: string; initialValue?: boolean }) => Promise<boolean>;
  select: <T = string>(opts: {
    message: string;
    options: WizardSelectOption<T>[];
    initialValue?: T;
  }) => Promise<T>;
  multiselect: <T = string>(opts: {
    message: string;
    options: WizardSelectOption<T>[];
    initialValues?: T[];
    required?: boolean;
  }) => Promise<T[]>;
  note: (message: string, title?: string) => Promise<void>;
  progress: (messageOrOpts?: string | { message?: string }) => {
    update: (msg: string) => void;
    stop: (msg?: string) => void;
    message: string;
  };
  spinner: () => {
    start: (message?: string) => void;
    stop: (message?: string) => void;
  };
};

export type WizardPromptResult = string;

// ---------------------------------------------------------------------------
// Error class used by callers to detect user cancellation
// ---------------------------------------------------------------------------

export class WizardCancelledError extends Error {
  constructor(message = "Wizard cancelled") {
    super(message);
    this.name = "WizardCancelledError";
  }
}

// ---------------------------------------------------------------------------
// Factory (no-op)
// ---------------------------------------------------------------------------

export function createClackPrompter(): WizardPrompter {
  const noop = async () => {};
  return {
    intro: noop,
    outro: noop,
    text: async () => "",
    confirm: async () => false,
    select: async () => "" as never,
    multiselect: async () => [] as never,
    note: async () => {},
    progress: (_messageOrOpts?: string | { message?: string }) => ({ update: () => {}, stop: () => {}, message: "" }),
    spinner: () => ({ start: () => {}, stop: () => {} }),
  };
}
