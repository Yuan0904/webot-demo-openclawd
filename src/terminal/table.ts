export function renderTable(data: unknown, opts?: Record<string, unknown>): string {
  if (Array.isArray(data)) {
    return data.map((r: unknown) => (Array.isArray(r) ? r.join("\t") : String(r))).join("\n");
  }
  return "";
}
