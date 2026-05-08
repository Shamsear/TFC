/**
 * Image CDN Helper
 * Provides URLs for player card images from GitHub CDN
 */

const CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards';
const LOCAL_BASE_URL = '/player_cards';

// Set to true for local development, false for production
const USE_LOCAL = process.env.NODE_ENV === 'development';

/**
 * Get the full URL for a player card image
 * @param filename - The image filename (e.g., "player_123.png")
 * @returns Full URL to the image
 */
export function getPlayerCardUrl(filename: string): string {
  if (!filename) return '';
  
  // Remove leading slash if present
  const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;
  
  if (USE_LOCAL) {
    return `${LOCAL_BASE_URL}/${cleanFilename}`;
  }
  
  return `${CDN_BASE_URL}/${cleanFilename}`;
}

/**
 * Get the base URL for player cards
 */
export function getPlayerCardBaseUrl(): string {
  return USE_LOCAL ? LOCAL_BASE_URL : CDN_BASE_URL;
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
