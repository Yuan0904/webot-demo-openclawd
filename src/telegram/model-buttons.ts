/**
 * Stub for the deleted telegram/model-buttons module.
 */

export type ProviderInfo = {
  id: string;
  count: number;
};

export function buildProviderKeyboard(
  _providers: ProviderInfo[],
): unknown[][] {
  return [];
}

export function buildModelsKeyboard(_params: {
  provider: string;
  models: string[];
  currentModel?: string;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}): unknown[][] {
  return [];
}

export function buildBrowseProvidersButton(): unknown[][] {
  return [];
}

export function getModelsPageSize(): number {
  return 20;
}

export function calculateTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
