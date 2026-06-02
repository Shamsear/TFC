/**
 * News utility functions
 */

/**
 * Clean manager name - remove placeholder text and return proper fallback
 */
export function getCleanManagerName(managerName: string | null | undefined): string {
  if (!managerName) return 'Unknown Manager';
  
  // List of placeholder patterns to filter out
  const placeholders = [
    'whoever they are',
    'unknown',
    'tbd',
    'to be determined',
    'n/a',
    'na',
    'none',
    'placeholder',
    'temp',
    'temporary',
    'test',
    'dummy'
  ];
  
  const lowerName = managerName.toLowerCase().trim();
  
  // Check if it's a placeholder
  if (placeholders.some(p => lowerName === p || lowerName.includes(p))) {
    return 'Unknown Manager';
  }
  
  // Check if it's just whitespace or very short
  if (managerName.trim().length < 2) {
    return 'Unknown Manager';
  }
  
  return managerName.trim();
}
