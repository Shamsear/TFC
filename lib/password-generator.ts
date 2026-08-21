/**
 * Generate a password from a name (manager or team)
 * Format: {name}1234
 * Example: "AS Roma" -> "asroma1234"
 */
export function generatePasswordFromTeamName(name: string): string {
  // Remove special characters, spaces, convert to lowercase
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric
    .trim()

  return `${cleanName}1234`
}

/**
 * Generate email from a name (manager or team)
 * Format: {name}@tfc.com
 * Example: "Real Madrid" -> "realmadrid@tfc.com"
 */
export function generateEmailFromTeamName(name: string): string {
  // Remove special characters, spaces, convert to lowercase
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric
    .trim()

  return `${cleanName}@tfc.com`
}

/**
 * Check if email already exists and add suffix if needed
 */
export async function generateUniqueEmail(
  name: string,
  checkExists: (email: string) => Promise<boolean>
): Promise<string> {
  let email = generateEmailFromTeamName(name)
  let counter = 1

  while (await checkExists(email)) {
    email = generateEmailFromTeamName(`${name}${counter}`)
    counter++
  }

  return email
}
