/**
 * Normalize a string by removing accents/diacritics
 * Converts: "Vinícius Júnior" → "Vinicius Junior"
 */
export function normalizeString(str: string): string {
  return str
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .toLowerCase()
    .trim();
}

// Alias for backward compatibility
export const normalizeForSearch = normalizeString;

/**
 * Check if a normalized search query matches a normalized target string
 */
export function matchesSearch(target: string, query: string): boolean {
  return normalizeString(target).includes(normalizeString(query));
}
