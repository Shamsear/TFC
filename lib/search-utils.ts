/**
 * Normalizes a string for search by removing diacritics and converting to lowercase
 * Examples: 
 * - "Müller" -> "muller"
 * - "José" -> "jose"
 * - "Özil" -> "ozil"
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
}

/**
 * Checks if a text matches a search query (case-insensitive, diacritic-insensitive)
 */
export function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true
  return normalizeForSearch(text).includes(normalizeForSearch(query))
}
