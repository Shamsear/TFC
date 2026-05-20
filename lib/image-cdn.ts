/**
 * Image CDN Helper
 * Provides URLs for player card images and photos from GitHub CDN
 */

const GITHUB_REPO = 'https://raw.githubusercontent.com/Shamsear/TFC-Images/main';
const CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main';

// Enable fast global CDN (jsDelivr) for instant image loading without rate limits
const USE_CDN = true;
const BASE_URL = USE_CDN ? CDN_BASE_URL : GITHUB_REPO;

/**
 * Get the full URL for a player card image
 * @param filename - The image filename (e.g., "player_123.png" or "17592186045227.png")
 * @returns Full URL to the image
 */
export function getPlayerCardUrl(filename: string | null | undefined): string {
  if (!filename) return '/default-player-card.png';
  
  // Remove leading slash and path if present
  const cleanFilename = filename.split('/').pop() || filename;
  
  return `${BASE_URL}/public/player_cards/${cleanFilename}`;
}

/**
 * Get the full URL for a player photo
 * @param filename - The image filename (e.g., "player_123.png" or "17592186045227.png")
 * @returns Full URL to the image
 */
export function getPlayerPhotoUrl(filename: string | null | undefined): string {
  if (!filename) return '/default-player.png';
  
  // Remove leading slash and path if present
  const cleanFilename = filename.split('/').pop() || filename;
  
  return `${BASE_URL}/public/player_photos/${cleanFilename}`;
}

/**
 * Get the base URL for player cards
 */
export function getPlayerCardBaseUrl(): string {
  return `${BASE_URL}/public/player_cards`;
}

/**
 * Get the base URL for player photos
 */
export function getPlayerPhotoBaseUrl(): string {
  return `${BASE_URL}/public/player_photos`;
}

/**
 * Convert a local player card path to CDN URL
 * @param localPath - Local path like "/player_cards/player_123.png"
 * @returns CDN URL
 */
export function localToCdnUrl(localPath: string): string {
  if (!localPath) return '';
  
  // Extract filename from path
  const filename = localPath.split('/').pop() || '';
  return getPlayerCardUrl(filename);
}

/**
 * Convert a photoUrl from database to CDN URL
 * Handles both local paths and player IDs
 * @param photoUrl - Photo URL from database (e.g., "/player_photos/123.png" or "123" or "123.webp")
 * @returns CDN URL
 */
export function getPhotoUrlFromDb(photoUrl: string | null | undefined): string {
  if (!photoUrl) return '/default-player.png';
  
  // If it's already a full URL, return as is
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Extract filename or use as is
  const filename = photoUrl.split('/').pop() || photoUrl;
  
  // If it doesn't have an extension, assume it's a player ID and add .webp (default format)
  const finalFilename = filename.includes('.') ? filename : `${filename}.webp`;
  
  return getPlayerPhotoUrl(finalFilename);
}

/**
 * Get player card URL from player ID
 * @param playerId - The player ID (e.g., "17592186045227")
 * @returns CDN URL for the player card
 */
export function getPlayerCardById(playerId: string | null | undefined): string {
  if (!playerId) return '/default-player-card.png';
  
  return getPlayerCardUrl(`${playerId}.png`);
}
