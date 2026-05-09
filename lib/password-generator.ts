/**
 * Generate a password based on team name
 * Format: {teamname}1234
 * Example: "AS Roma" -> "asroma1234"
 */
export function generatePasswordFromTeamName(teamName: string): string {
  // Remove special characters, spaces, convert to lowercase
  const cleanName = teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric
    .trim()

  return `${cleanName}1234`
}

/**
 * Generate email from team name
 * Format: {teamname}@tfc.com
 * Example: "Real Madrid" -> "realmadrid@tfc.com"
 */
export function generateEmailFromTeamName(teamName: string): string {
  // Remove special characters, spaces, convert to lowercase
  const cleanName = teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric
    .trim()

  return `${cleanName}@tfc.com`
}

/**
 * Check if email already exists and add suffix if needed
 */
export async function generateUniqueEmail(
  teamName: string,
  checkExists: (email: string) => Promise<boolean>
): Promise<string> {
  let email = generateEmailFromTeamName(teamName)
  let counter = 1

  while (await checkExists(email)) {
    email = generateEmailFromTeamName(`${teamName}${counter}`)
    counter++
  }

  return email
}
