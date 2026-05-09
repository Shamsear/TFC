/**
 * Generate a random password
 * Format: 1 uppercase + 6 lowercase + 1 number = 8 characters
 * Example: Abcdefg1
 */
export function generatePassword(): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ" // Exclude I, O for clarity
  const lowercase = "abcdefghjkmnpqrstuvwxyz" // Exclude i, l, o for clarity
  const numbers = "23456789" // Exclude 0, 1 for clarity

  let password = ""

  // 1 uppercase letter
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))

  // 6 lowercase letters
  for (let i = 0; i < 6; i++) {
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
  }

  // 1 number
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))

  return password
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
