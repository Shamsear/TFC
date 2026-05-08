/**
 * Property-Based Tests: Database Parser
 * 
 * Tests Properties 32-35 from the design document
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parseDBFile, prettyPrintDB, DBPlayerRecord } from '@/lib/db-parser'

// Custom arbitraries for generating test data
const validPlayerIdArb = fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('|') && s.trim().length > 0)
const validPlayerNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes('|') && s.trim().length > 0)
const validPositionArb = fc.constantFrom('GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'SS', 'LWF', 'RWF', 'CF')
const validClubArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('|') && s.trim().length > 0)
const validRatingArb = fc.integer({ min: 40, max: 99 })
const validPhotoUrlArb = fc.oneof(
  fc.constant(''),
  fc.webUrl()
)

const validPlayerRecordArb: fc.Arbitrary<DBPlayerRecord> = fc.record({
  id: validPlayerIdArb,
  name: validPlayerNameArb,
  position: validPositionArb,
  club: validClubArb,
  rating: validRatingArb,
  photoUrl: validPhotoUrlArb,
})

describe('Property Tests: Database Parser', () => {
  it('Property 32: DB Parser Handles Valid Input', async () => {
    /**
     * Feature: turf-cats-tournament-platform
     * Property 32: For any valid .db file content, the parser should successfully
     * parse it into a collection of base player objects with all required fields populated.
     * 
     * **Validates: Requirements 21.1**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(validPlayerRecordArb, { minLength: 1, maxLength: 50 }),
        
        async (players) => {
          // Setup: Create valid .db file content
          const fileContent = players
            .map(p => `${p.id}|${p.name}|${p.position}|${p.club}|${p.rating}|${p.photoUrl}`)
            .join('\n')
          
          // Execute: Parse the file
          const result = parseDBFile(fileContent)
          
          // Verify: Parse succeeds and all fields are populated
          expect(result.success).toBe(true)
          expect(result.players).toBeDefined()
          expect(result.players!.length).toBe(players.length)
          
          // Verify: Each player has all required fields
          result.players!.forEach((parsedPlayer, index) => {
            const originalPlayer = players[index]
            expect(parsedPlayer.id).toBe(originalPlayer.id)
            expect(parsedPlayer.name).toBe(originalPlayer.name)
            expect(parsedPlayer.position).toBe(originalPlayer.position)
            expect(parsedPlayer.club).toBe(originalPlayer.club)
            expect(parsedPlayer.rating).toBe(originalPlayer.rating)
            expect(parsedPlayer.photoUrl).toBe(originalPlayer.photoUrl)
            
            // Verify: Required fields are non-empty
            expect(parsedPlayer.id.length).toBeGreaterThan(0)
            expect(parsedPlayer.name.length).toBeGreaterThan(0)
            expect(parsedPlayer.position.length).toBeGreaterThan(0)
            expect(parsedPlayer.club.length).toBeGreaterThan(0)
            expect(parsedPlayer.rating).toBeGreaterThanOrEqual(40)
            expect(parsedPlayer.rating).toBeLessThanOrEqual(99)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 33: DB Parser Rejects Invalid Input', async () => {
    /**
     * Feature: turf-cats-tournament-platform
     * Property 33: For any invalid .db file content (malformed records, missing
     * required fields), the parser should return a descriptive error message
     * and not create any player records.
     * 
     * **Validates: Requirements 21.2**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Missing fields (less than 5 fields)
          fc.tuple(
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 }),
            fc.string({ minLength: 1 })
          ).map(([a, b, c]) => `${a}|${b}|${c}`),
          
          // Empty required field (id)
          fc.tuple(
            fc.constant(''),
            validPlayerNameArb,
            validPositionArb,
            validClubArb,
            validRatingArb
          ).map(([id, name, pos, club, rating]) => `${id}|${name}|${pos}|${club}|${rating}|`),
          
          // Empty required field (name)
          fc.tuple(
            validPlayerIdArb,
            fc.constant(''),
            validPositionArb,
            validClubArb,
            validRatingArb
          ).map(([id, name, pos, club, rating]) => `${id}|${name}|${pos}|${club}|${rating}|`),
          
          // Empty required field (position)
          fc.tuple(
            validPlayerIdArb,
            validPlayerNameArb,
            fc.constant(''),
            validClubArb,
            validRatingArb
          ).map(([id, name, pos, club, rating]) => `${id}|${name}|${pos}|${club}|${rating}|`),
          
          // Empty required field (club)
          fc.tuple(
            validPlayerIdArb,
            validPlayerNameArb,
            validPositionArb,
            fc.constant(''),
            validRatingArb
          ).map(([id, name, pos, club, rating]) => `${id}|${name}|${pos}|${club}|${rating}|`),
          
          // Invalid rating (not a number)
          fc.tuple(
            validPlayerIdArb,
            validPlayerNameArb,
            validPositionArb,
            validClubArb,
            fc.string({ minLength: 1 }).filter(s => isNaN(parseInt(s, 10)))
          ).map(([id, name, pos, club, rating]) => `${id}|${name}|${pos}|${club}|${rating}|`)
        ),
        
        async (invalidContent) => {
          // Execute: Parse invalid content
          const result = parseDBFile(invalidContent)
          
          // Verify: Parse fails with error message
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(result.error!.length).toBeGreaterThan(0)
          expect(result.players).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 34: DB Pretty Printer Formats Correctly', async () => {
    /**
     * Feature: turf-cats-tournament-platform
     * Property 34: For any collection of base player objects, the pretty printer
     * should format them into valid .db file format that conforms to the expected structure.
     * 
     * **Validates: Requirements 21.3**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(validPlayerRecordArb, { minLength: 1, maxLength: 50 }),
        
        async (players) => {
          // Execute: Pretty print the players
          const formatted = prettyPrintDB(players)
          
          // Verify: Output is properly formatted
          const lines = formatted.split('\n')
          expect(lines.length).toBe(players.length)
          
          // Verify: Each line has correct format
          lines.forEach((line, index) => {
            const parts = line.split('|')
            expect(parts.length).toBe(6) // id|name|position|club|rating|photoUrl
            
            const player = players[index]
            expect(parts[0]).toBe(player.id)
            expect(parts[1]).toBe(player.name)
            expect(parts[2]).toBe(player.position)
            expect(parts[3]).toBe(player.club)
            expect(parts[4]).toBe(player.rating.toString())
            expect(parts[5]).toBe(player.photoUrl)
          })
          
          // Verify: Output can be parsed back successfully
          const parseResult = parseDBFile(formatted)
          expect(parseResult.success).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 35: DB Parser Round-Trip', async () => {
    /**
     * Feature: turf-cats-tournament-platform
     * Property 35: For any valid collection of base player objects, parsing the
     * pretty-printed output and then parsing again should produce an equivalent
     * collection of player objects (round-trip property).
     * 
     * **Validates: Requirements 21.4**
     */
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(validPlayerRecordArb, { minLength: 1, maxLength: 50 }),
        
        async (originalPlayers) => {
          // Execute: Round-trip transformation
          // Step 1: Pretty print
          const formatted = prettyPrintDB(originalPlayers)
          
          // Step 2: Parse
          const parseResult1 = parseDBFile(formatted)
          expect(parseResult1.success).toBe(true)
          const parsedPlayers1 = parseResult1.players!
          
          // Step 3: Pretty print again
          const formatted2 = prettyPrintDB(parsedPlayers1)
          
          // Step 4: Parse again
          const parseResult2 = parseDBFile(formatted2)
          expect(parseResult2.success).toBe(true)
          const parsedPlayers2 = parseResult2.players!
          
          // Verify: All three representations are equivalent
          expect(parsedPlayers1.length).toBe(originalPlayers.length)
          expect(parsedPlayers2.length).toBe(originalPlayers.length)
          expect(formatted).toBe(formatted2)
          
          // Verify: Each player is equivalent across all transformations
          for (let i = 0; i < originalPlayers.length; i++) {
            const original = originalPlayers[i]
            const parsed1 = parsedPlayers1[i]
            const parsed2 = parsedPlayers2[i]
            
            // Check original vs first parse
            expect(parsed1.id).toBe(original.id)
            expect(parsed1.name).toBe(original.name)
            expect(parsed1.position).toBe(original.position)
            expect(parsed1.club).toBe(original.club)
            expect(parsed1.rating).toBe(original.rating)
            expect(parsed1.photoUrl).toBe(original.photoUrl)
            
            // Check first parse vs second parse
            expect(parsed2.id).toBe(parsed1.id)
            expect(parsed2.name).toBe(parsed1.name)
            expect(parsed2.position).toBe(parsed1.position)
            expect(parsed2.club).toBe(parsed1.club)
            expect(parsed2.rating).toBe(parsed1.rating)
            expect(parsed2.photoUrl).toBe(parsed1.photoUrl)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
