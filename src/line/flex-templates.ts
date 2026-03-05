/**
 * Stub for the deleted line/flex-templates module.
 */

export type CardAction = {
  label: string;
  uri?: string;
  text?: string;
};

export type ListItem = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  action?: CardAction;
};

export function createInfoCard(..._args: unknown[]): unknown { return {}; }
export function createListCard(..._args: unknown[]): unknown { return {}; }
export function createImageCard(..._args: unknown[]): unknown { return {}; }
export function createActionCard(..._args: unknown[]): unknown { return {}; }
export function createReceiptCard(..._args: unknown[]): unknown { return {}; }
