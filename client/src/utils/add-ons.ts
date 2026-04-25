// Re-exports the shared add-on catalogue plus a tiny client-only helper for
// remembering selections across navigations (e.g. tier selection -> dialog).

import { ADD_ONS, type AddOn } from "@shared/add-ons";

export { ADD_ONS };
export type { AddOn };

const STORAGE_KEY = "selectedAddOns";

export function getSelectedAddOnIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(ADD_ONS.map((a) => a.id));
    return parsed.filter((id): id is string => typeof id === "string" && valid.has(id));
  } catch {
    return [];
  }
}

export function saveSelectedAddOnIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota/availability errors — selection is best-effort
  }
}

export function clearSelectedAddOns(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
