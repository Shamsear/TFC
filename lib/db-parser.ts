/**
 * Database file parser for Turf Cats platform
 * Parses pipe-delimited player data files
 */

export interface DBPlayerRecord {
  id: string;
  name: string;
  position: string;
  club: string;
  rating: number;
  photoUrl: string;
  starRating?: number;
}

export interface ParseResult {
  success: boolean;
  players?: DBPlayerRecord[];
  error?: string;
}

/**
 * Parses a .db file with pipe-delimited format
 * Format: id|name|position|club|rating|photoUrl
 * 
 * @param fileContent - Raw file content as string
 * @returns ParseResult with players array or error message
 */
export function parseDBFile(fileContent: string): ParseResult {
  try {
    const lines = fileContent.trim().split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        success: false,
        error: 'File is empty'
      };
    }

    const players: DBPlayerRecord[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split('|');

      // Validate required fields (id, name, position, club, rating are required)
      if (parts.length < 5) {
        errors.push(`Line ${i + 1}: Invalid format - expected at least 5 fields, got ${parts.length}`);
        continue;
      }

      const [id, name, position, club, ratingStr, photoUrl, starRatingStr] = parts;

      // Validate required fields are not empty
      if (!id || id.trim() === '') {
        errors.push(`Line ${i + 1}: Missing required field 'id'`);
        continue;
      }

      if (!name || name.trim() === '') {
        errors.push(`Line ${i + 1}: Missing required field 'name'`);
        continue;
      }

      if (!position || position.trim() === '') {
        errors.push(`Line ${i + 1}: Missing required field 'position'`);
        continue;
      }

      if (!club || club.trim() === '') {
        errors.push(`Line ${i + 1}: Missing required field 'club'`);
        continue;
      }

      if (!ratingStr || ratingStr.trim() === '') {
        errors.push(`Line ${i + 1}: Missing required field 'rating'`);
        continue;
      }

      // Validate rating is a valid number
      const rating = parseInt(ratingStr.trim(), 10);
      if (isNaN(rating)) {
        errors.push(`Line ${i + 1}: Invalid rating value '${ratingStr}' - must be a number`);
        continue;
      }

      // photoUrl is optional, use empty string if not provided
      const finalPhotoUrl = photoUrl ? photoUrl.trim() : '';

      // starRating is optional
      let starRating: number | undefined;
      if (starRatingStr && starRatingStr.trim() !== '') {
        const parsedStarRating = parseInt(starRatingStr.trim(), 10);
        if (!isNaN(parsedStarRating)) {
          starRating = parsedStarRating;
        }
      }

      players.push({
        id: id.trim(),
        name: name.trim(),
        position: position.trim(),
        club: club.trim(),
        rating,
        photoUrl: finalPhotoUrl,
        starRating
      });
    }

    // If we have errors but also some valid players, still return success with players
    // If we have only errors and no players, return failure
    if (players.length === 0 && errors.length > 0) {
      return {
        success: false,
        error: errors.join('; ')
      };
    }

    return {
      success: true,
      players
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

/**
 * Formats player records back into pipe-delimited format
 * 
 * @param players - Array of player records
 * @returns Formatted string in pipe-delimited format
 */
export function prettyPrintDB(players: DBPlayerRecord[]): string {
  return players
    .map(p => `${p.id}|${p.name}|${p.position}|${p.club}|${p.rating}|${p.photoUrl}`)
    .join('\n');
}
