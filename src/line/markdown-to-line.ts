/**
 * Stub for the deleted line/markdown-to-line module.
 */

export type ProcessedLineMessage = {
  type: string;
  text?: string;
  altText?: string;
  contents?: unknown;
};

export function processLineMessage(text: string): ProcessedLineMessage[] {
  return [{ type: "text", text }];
}

export function hasMarkdownToConvert(_text: string): boolean {
  return false;
}

export function stripMarkdown(text: string): string {
  return text;
}
