export const ADD_ONS = [
  { id: "leather", name: "Leather Treatment", price: 35 },
  { id: "clay", name: "Clay Bar Treatment", price: 45 },
  { id: "sanitize", name: "Interior Sanitization", price: 25 },
  { id: "wax", name: "Premium Wax", price: 30 },
  { id: "dog-hair", name: "Dog Hair Removal", price: 20 },
  { id: "odor", name: "Odor Eliminator", price: 50 },
];

const STORAGE_KEY = "selectedAddOns";

export function getSelectedAddOnIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveSelectedAddOnIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function clearSelectedAddOns(): void {
  localStorage.removeItem(STORAGE_KEY);
}
